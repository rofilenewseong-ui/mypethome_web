import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { creditService, CREDIT_COSTS } from './credit.service';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { gifService, GIF_PRESETS } from './gif.service';
import axios from 'axios';

// ============================================
// 프롬프트 보안 로더 (prompts.secret.json)
// GitHub에 절대 올라가지 않는 비밀 파일에서 프롬프트를 로드
// ============================================
interface PromptsConfig {
  gemini: {
    model: {
      test: string;
      production: string;
    };
    imageConfig: {
      aspectRatio: string;
      imageSize: string;
      responseModalities: string[];
    };
    startFrame: {
      bare: string;   // ref 2장 (얼굴 + 전신) 전용
      outfit: string; // ref 3장 (얼굴 + 전신 + 옷) 전용
    };
    rules: Record<string, string>;
  };
  kling: {
    model: string;
    duration: string;
    aspectRatio: string;
    mode: string;
    imageToVideo: {
      baseVideoPrompt: string;
      motionPrompts: Record<string, string>;
    };
  };
}

let _promptsCache: PromptsConfig | null = null;

function loadPrompts(): PromptsConfig {
  if (_promptsCache) return _promptsCache;

  // Mock 모드: prompts.secret.json 없이 빈 프롬프트 사용
  if (env.USE_MOCK_AI) {
    logger.info('[MOCK MODE] prompts.secret.json 없이 빈 프롬프트 사용');
    _promptsCache = {
      gemini: {
        model: { test: 'mock-model', production: 'mock-model' },
        imageConfig: { aspectRatio: '9:16', imageSize: '1024x1024', responseModalities: ['TEXT', 'IMAGE'] },
        startFrame: { bare: 'mock-prompt', outfit: 'mock-prompt' },
        rules: {},
      },
      kling: {
        model: 'mock-kling',
        duration: '5',
        aspectRatio: '9:16',
        mode: 'pro',
        imageToVideo: { baseVideoPrompt: 'mock video prompt', motionPrompts: {} },
      },
    };
    return _promptsCache;
  }

  const promptsPath = path.join(process.cwd(), 'prompts.secret.json');
  if (!fs.existsSync(promptsPath)) {
    logger.error('❌ prompts.secret.json 파일이 없습니다! 프롬프트 파일을 생성해주세요.');
    throw new AppError('프롬프트 설정 파일이 존재하지 않습니다. prompts.secret.json을 확인해주세요.', 500);
  }

  try {
    const raw = fs.readFileSync(promptsPath, 'utf-8');
    _promptsCache = JSON.parse(raw) as PromptsConfig;
    logger.info('✅ prompts.secret.json 로드 완료 (프롬프트 보안 적용)');
    return _promptsCache;
  } catch (error) {
    logger.error('❌ prompts.secret.json 파싱 실패:', error);
    throw new AppError('프롬프트 설정 파일을 읽을 수 없습니다.', 500);
  }
}

/**
 * 프롬프트 캐시 초기화 (파일 수정 후 리로드용)
 */
export function reloadPrompts(): void {
  _promptsCache = null;
  loadPrompts();
}

// ============================================
// Gemini SDK 인스턴스
// ============================================
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError('Gemini API 키가 설정되지 않았습니다. (.env GEMINI_API_KEY)', 500);
  }
  return new GoogleGenAI({ apiKey });
}

// ============================================
// Kling AI JWT Token Generator
// ============================================
function generateKlingToken(): string {
  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new AppError('Kling API 인증 정보가 설정되지 않았습니다.', 500);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30분 유효
    nbf: now - 5,
    iat: now,
  };

  return jwt.sign(payload, secretKey, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' },
  });
}

// ============================================
// Gemini 스타트 프레임 생성 (SDK 사용)
// 가이드에 따라 정확한 순서로 contents 구성
// ============================================
async function generateStartFrame(
  refImages: Array<{ base64: string; mimeType: string }>,
  useProductionModel: boolean = false
): Promise<{ base64: string; mimeType: string } | null> {
  // Mock 모드: Gemini API 호출 스킵, 업로드된 이미지를 순환 반환 (3장 구분)
  if (env.USE_MOCK_AI) {
    // refImages 중 서로 다른 이미지를 순환 반환하여 3장이 구분되도록 함
    const mockIndex = (generateStartFrame as any).__mockCounter || 0;
    (generateStartFrame as any).__mockCounter = mockIndex + 1;
    const selectedRef = refImages[mockIndex % refImages.length];
    logger.info(`[MOCK MODE] Gemini 스타트프레임 생성 스킵 → ref[${mockIndex % refImages.length}] 반환`);
    return { base64: selectedRef.base64, mimeType: selectedRef.mimeType };
  }

  const prompts = loadPrompts();
  const ai = getGeminiClient();

  // ref 개수에 따라 BARE / OUTFIT 프롬프트 자동 선택
  const refCount = refImages.length;
  if (refCount < 2) {
    throw new AppError('최소 2장의 레퍼런스 이미지가 필요합니다 (얼굴 + 전신).', 400);
  }

  const prompt = refCount >= 3
    ? prompts.gemini.startFrame.outfit
    : prompts.gemini.startFrame.bare;

  const promptType = refCount >= 3 ? 'OUTFIT' : 'BARE';

  // 모델 선택 (test / production)
  const model = useProductionModel
    ? prompts.gemini.model.production
    : (process.env.GEMINI_MODEL || prompts.gemini.model.test);

  logger.info(`Gemini 스타트프레임 생성: model=${model}, type=${promptType}, refs=${refCount}`);

  // ★ contents 배열 순서 엄수: [프롬프트, ref1(얼굴), ref2(전신), ref3(옷)]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [{ text: prompt }];

  for (let i = 0; i < refImages.length; i++) {
    contents.push({
      inlineData: {
        mimeType: refImages[i].mimeType,
        data: refImages[i].base64,
      },
    });
  }

  // API 호출 (SDK 사용)
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseModalities: ['TEXT', 'IMAGE'] as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      imageConfig: {
        aspectRatio: prompts.gemini.imageConfig.aspectRatio,
        imageSize: prompts.gemini.imageConfig.imageSize,
      } as any,
    },
  });

  // 결과에서 이미지 추출
  const candidates = (response as any).candidates;
  if (!candidates || candidates.length === 0) {
    logger.warn('Gemini 응답에 candidates가 없습니다.');
    return null;
  }

  const parts = candidates[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      logger.info('Gemini 스타트프레임 이미지 생성 성공');
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  logger.warn('Gemini 응답에 이미지가 없습니다.');
  return null;
}

// ============================================
// Kling API Helper (영상 생성)
// ============================================
async function callKlingImageToVideo(
  imageUrl: string,
  prompt: string
): Promise<{ taskId: string; taskStatus: string }> {
  // Mock 모드: Kling API 호출 스킵, 가짜 taskId 반환
  if (env.USE_MOCK_AI) {
    const mockTaskId = `mock-kling-${Date.now()}`;
    logger.info(`[MOCK MODE] Kling 영상 생성 스킵 → taskId: ${mockTaskId}`);
    return { taskId: mockTaskId, taskStatus: 'submitted' };
  }

  const baseUrl = process.env.KLING_API_URL || 'https://api.klingai.com';
  const token = generateKlingToken();
  const prompts = loadPrompts();

  const requestBody = {
    model_name: prompts.kling.model || 'kling-v3',
    image: imageUrl,
    prompt,
    mode: prompts.kling.mode || 'pro',
    duration: prompts.kling.duration || '5',
    aspect_ratio: prompts.kling.aspectRatio || '9:16',
    callback_url: '',
  };

  logger.info(`Kling API 호출: image2video`);

  const response = await fetch(`${baseUrl}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Kling API 오류: ${response.status} - ${errorText}`);
    throw new AppError(`Kling API 호출 실패: ${response.status}`, 502);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await response.json() as any;
  if (result.code !== 0) {
    logger.error(`Kling API 비즈니스 오류: ${result.code} - ${result.message}`);
    throw new AppError(`Kling 영상 생성 실패: ${result.message}`, 502);
  }

  return {
    taskId: result.data.task_id,
    taskStatus: result.data.task_status,
  };
}

async function queryKlingVideoTask(taskId: string): Promise<{
  status: string;
  statusMsg?: string;
  videoUrl?: string;
  duration?: string;
}> {
  const baseUrl = process.env.KLING_API_URL || 'https://api.klingai.com';
  const token = generateKlingToken();

  const response = await fetch(`${baseUrl}/v1/videos/image2video/${taskId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Kling 상태 조회 오류: ${response.status} - ${errorText}`);
    throw new AppError(`Kling 상태 조회 실패: ${response.status}`, 502);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await response.json() as any;
  if (result.code !== 0) {
    throw new AppError(`Kling 상태 조회 실패: ${result.message}`, 502);
  }

  const data = result.data;
  const videoResult = data.task_result?.videos?.[0];

  return {
    status: data.task_status,
    statusMsg: data.task_status_msg,
    videoUrl: videoResult?.url,
    duration: videoResult?.duration,
  };
}

// ============================================
// 이미지 파일 저장 유틸리티
// ============================================
function saveBase64Image(base64Data: string, mimeType: string, filename: string): string {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'generated');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
  const fullFilename = `${filename}${ext}`;
  const filePath = path.join(uploadsDir, fullFilename);

  fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  logger.info(`이미지 저장: ${filePath}`);

  return `/uploads/generated/${fullFilename}`;
}

// ============================================
// 이미지 URL → base64 변환 유틸리티
// 펫 등록 사진 URL을 Gemini용 base64로 변환
// ============================================
async function resolveImageToBase64(imageInput: string): Promise<string> {
  // 1. data:image/jpeg;base64,... 형식 → base64 부분만 추출
  if (imageInput.startsWith('data:')) {
    return imageInput.split(',')[1] || imageInput;
  }

  // 2. 로컬 서버 URL → 파일 시스템에서 직접 읽기 (네트워크 우회)
  if (imageInput.startsWith('http://localhost') || imageInput.startsWith('https://localhost') || imageInput.startsWith('http://127.0.0.1')) {
    try {
      const urlPath = new URL(imageInput).pathname; // e.g. /uploads/generated/xxx.png
      const filePath = path.join(process.cwd(), urlPath.substring(1)); // Remove leading /
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        logger.info(`로컬 서버 URL → base64 변환 완료: ${urlPath}`);
        return buffer.toString('base64');
      }
    } catch (err) {
      logger.warn(`로컬 URL 파일 읽기 실패, HTTP 다운로드 시도: ${imageInput}`, err);
    }
  }

  // 3. HTTP(S) URL → 다운로드 → base64 변환
  if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
    try {
      const response = await axios.get(imageInput, { responseType: 'arraybuffer', timeout: 30000 });
      const base64 = Buffer.from(response.data).toString('base64');
      logger.info(`이미지 URL → base64 변환 완료: ${imageInput.substring(0, 60)}...`);
      return base64;
    } catch (error) {
      logger.error(`이미지 URL 다운로드 실패: ${imageInput}`, error);
      throw new AppError('이미지를 다운로드할 수 없습니다. URL을 확인해주세요.', 400);
    }
  }

  // 3. 스토리지 키 (상대 경로) → 디스크에서 읽기 → base64 변환
  //    예: 'pets/userId/xxx.jpg' 또는 '/uploads/pets/userId/xxx.jpg'
  const possiblePaths = [
    // 스토리지 키 그대로 (uploads/ 프리픽스 없음): 'pets/userId/xxx.jpg'
    path.join(process.cwd(), 'uploads', imageInput),
    // /uploads/ 프리픽스 포함: '/uploads/pets/userId/xxx.jpg'
    imageInput.startsWith('/uploads/')
      ? path.join(process.cwd(), imageInput.substring(1))
      : '',
    // /uploads/generated/ 등 절대 경로
    imageInput.startsWith('/')
      ? path.join(process.cwd(), imageInput.substring(1))
      : '',
  ].filter(Boolean);

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        logger.info(`스토리지 키 → base64 변환 완료: ${filePath}`);
        return buffer.toString('base64');
      }
    } catch (err) {
      logger.warn(`파일 읽기 실패: ${filePath}`, err);
    }
  }

  // 4. 마지막 폴백: 이미 순수 base64 문자열인 경우
  //    (길이가 충분히 긴 경우만 — 짧은 문자열은 경로일 수 있음)
  if (imageInput.length > 100) {
    logger.info(`순수 base64 문자열로 간주: length=${imageInput.length}`);
    return imageInput;
  }

  logger.error(`이미지를 해석할 수 없습니다: ${imageInput.substring(0, 80)}`);
  throw new AppError('이미지 파일을 찾을 수 없습니다. 펫 등록 사진을 확인해주세요.', 400);
}

// ============================================
// AI Service
// ============================================
export class AiService {

  /**
   * 스타트 프레임 이미지 생성 (Gemini)
   *
   * 동일 프롬프트로 3장 생성 → 사용자가 베스트 1장 선택
   *
   * ref 이미지 순서:
   * - ref1: 얼굴 클로즈업 (필수)
   * - ref2: 전신 (필수)
   * - ref3: 옷/악세서리 (선택 — 있으면 OUTFIT 프롬프트, 없으면 BARE 프롬프트)
   */
  async generateStartFrameImages(
    userId: string,
    profileId: string,
    imageData: {
      faceImage: string;      // ref1: 얼굴 base64
      bodyImage: string;      // ref2: 전신 base64
      outfitImage?: string;   // ref3: 옷 base64 (선택)
      mimeType?: string;
    }
  ) {
    // 프로필 검증
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    // 30분 만료
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Firestore에 작업 생성
    const jobRef = db.collection('startFrameJobs').doc();
    const refCount = imageData.outfitImage ? 3 : 2;

    await jobRef.set({
      profileId,
      userId,
      status: 'PROCESSING',
      promptType: refCount >= 3 ? 'OUTFIT' : 'BARE',
      refCount,
      retryCount: 0, // ★ 재생성 횟수 (최초 1회 무료, 이후 10C)
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      images: null,
      selectedImageUrl: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`스타트프레임 생성 작업 시작: ${jobRef.id} (${refCount >= 3 ? 'OUTFIT' : 'BARE'}, ${refCount}장 ref)`);

    // 비동기로 Gemini API 호출 (바로 jobId 반환)
    this._processStartFrameGeneration(jobRef.id, userId, imageData).catch((error) => {
      logger.error(`스타트프레임 생성 실패 (job: ${jobRef.id}):`, error);
    });

    return { jobId: jobRef.id, expiresAt };
  }

  /**
   * 스타트 프레임 생성 비동기 처리
   * 가이드: "동일 프롬프트로 3장 이상 생성 후 베스트 선택 권장"
   */
  private async _processStartFrameGeneration(
    jobId: string,
    userId: string,
    imageData: {
      faceImage: string;
      bodyImage: string;
      outfitImage?: string;
      mimeType?: string;
    }
  ) {
    try {
      const mimeType = imageData.mimeType || 'image/jpeg';
      const generatedImages: Array<{ url: string; label: string }> = [];

      // ★ ref 이미지 배열 구성 (순서 엄수: 얼굴 → 전신 → 옷)
      // URL이면 다운로드→base64 변환, base64이면 그대로 사용
      const faceBase64 = await resolveImageToBase64(imageData.faceImage);
      const bodyBase64 = await resolveImageToBase64(imageData.bodyImage);

      const refImages: Array<{ base64: string; mimeType: string }> = [
        { base64: faceBase64, mimeType },   // ref1: 얼굴 (펫 정면 사진)
        { base64: bodyBase64, mimeType },    // ref2: 전신 (펫 전신 사진)
      ];

      if (imageData.outfitImage) {
        const outfitBase64 = await resolveImageToBase64(imageData.outfitImage);
        refImages.push({ base64: outfitBase64, mimeType }); // ref3: 옷 (위자드 업로드)
      }

      // 동일 프롬프트로 3장 생성
      const generateCount = 3;
      for (let i = 0; i < generateCount; i++) {
        try {
          logger.info(`스타트프레임 ${i + 1}/${generateCount} 생성 중... (job: ${jobId})`);

          const result = await generateStartFrame(refImages, false); // test 모델 사용

          if (result) {
            const savedUrl = saveBase64Image(
              result.base64,
              result.mimeType,
              `${jobId}_option_${i + 1}`
            );
            generatedImages.push({ url: savedUrl, label: `Option ${i + 1}` });
            logger.info(`스타트프레임 ${i + 1} 생성 성공: ${savedUrl}`);
          } else {
            logger.warn(`스타트프레임 ${i + 1} 생성 실패 (null 결과)`);
          }
        } catch (err) {
          logger.warn(`스타트프레임 ${i + 1} 생성 실패:`, err);
          // 개별 실패는 무시하고 계속 진행
        }
      }

      if (generatedImages.length === 0) {
        // ★ 나노바나나2 실패 → 환불 없이 실패 상태만 기록 (프론트에서 자동 재시도)
        await db.collection('startFrameJobs').doc(jobId).update({
          status: 'FAILED',
          error: '이미지 생성에 실패했습니다. 자동으로 다시 시도합니다.',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.warn(`스타트프레임 전체 실패 (job: ${jobId}) — 프론트에서 자동 재시도 예정`);
        return;
      }

      // 성공: 이미지 URL 저장
      await db.collection('startFrameJobs').doc(jobId).update({
        status: 'COMPLETED',
        images: JSON.stringify(generatedImages),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`스타트프레임 생성 완료 (job: ${jobId}): ${generatedImages.length}장 성공`);
    } catch (error) {
      // ★ 나노바나나2 처리 오류 → 환불 없이 실패 상태만 기록 (프론트에서 자동 재시도)
      logger.error(`스타트프레임 생성 처리 오류 (job: ${jobId}):`, error);
      await db.collection('startFrameJobs').doc(jobId).update({
        status: 'FAILED',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  /**
   * 스타트 프레임 재생성 (NanoBanana 2)
   * - 최초 1회: 무료
   * - 이후: NANOBANANA_RETRY (10C) 차감
   */
  async regenerateStartFrame(
    userId: string,
    jobId: string,
    imageData: {
      faceImage: string;
      bodyImage: string;
      outfitImage?: string;
      mimeType?: string;
    }
  ) {
    const jobDoc = await db.collection('startFrameJobs').doc(jobId).get();
    if (!jobDoc.exists) throw new AppError('작업을 찾을 수 없습니다.', 404);

    const jobData = jobDoc.data()!;
    if (jobData.userId !== userId) throw new AppError('접근 권한이 없습니다.', 403);

    const currentRetryCount = jobData.retryCount || 0;

    // 2번째 재생성부터 10C 차감
    if (currentRetryCount >= 1) {
      await creditService.spend(userId, CREDIT_COSTS.NANOBANANA_RETRY, '스타트프레임 재생성', 'PROFILE');
      logger.info(`재생성 크레딧 차감: user=${userId}, amount=${CREDIT_COSTS.NANOBANANA_RETRY}C (retry #${currentRetryCount + 1})`);
    }

    // 만료 시간 갱신 (30분)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 작업 상태 초기화
    await db.collection('startFrameJobs').doc(jobId).update({
      status: 'PROCESSING',
      retryCount: currentRetryCount + 1,
      images: null,
      selectedImageUrl: null,
      error: null,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`스타트프레임 재생성 시작: job=${jobId}, retry=#${currentRetryCount + 1}, paid=${currentRetryCount >= 1}`);

    // 비동기로 Gemini 재생성
    this._processStartFrameGeneration(jobId, userId, imageData).catch((error) => {
      logger.error(`스타트프레임 재생성 실패 (job: ${jobId}):`, error);
    });

    return {
      jobId,
      retryCount: currentRetryCount + 1,
      creditCharged: currentRetryCount >= 1 ? CREDIT_COSTS.NANOBANANA_RETRY : 0,
      expiresAt,
    };
  }

  /**
   * 생성된 스타트 프레임 이미지 중 하나 선택
   */
  async selectStartFrameImage(userId: string, jobId: string, selectedIndex: number) {
    const jobDoc = await db.collection('startFrameJobs').doc(jobId).get();
    if (!jobDoc.exists) throw new AppError('작업을 찾을 수 없습니다.', 404);

    const jobData = jobDoc.data()!;
    if (jobData.userId !== userId) throw new AppError('접근 권한이 없습니다.', 403);
    if (jobData.status === 'FAILED') throw new AppError('이미지 생성에 실패했습니다.', 400);
    if (jobData.status !== 'COMPLETED') throw new AppError('이미지 생성이 아직 완료되지 않았습니다.', 400);

    const expiresAt = jobData.expiresAt?.toDate?.() || jobData.expiresAt;
    if (new Date() > new Date(expiresAt)) throw new AppError('선택 시간이 만료되었습니다. (30분)', 400);

    const images = JSON.parse(jobData.images as string);
    if (selectedIndex < 0 || selectedIndex >= images.length) {
      throw new AppError('올바른 이미지 인덱스가 아닙니다.', 400);
    }

    const selectedUrl = images[selectedIndex].url;
    await db.collection('startFrameJobs').doc(jobId).update({
      selectedImageUrl: selectedUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 프로필의 PENDING 베이스 영상을 찾아서 baseVideoId 반환
    const profileId = jobData.profileId;
    let baseVideoId: string | null = null;
    if (profileId) {
      const baseVideoSnap = await db.collection('baseVideos')
        .where('profileId', '==', profileId)
        .where('status', '==', 'PENDING')
        .where('deletedAt', '==', null)
        .limit(1)
        .get();
      if (!baseVideoSnap.empty) {
        baseVideoId = baseVideoSnap.docs[0].id;
      }
    }

    logger.info(`스타트프레임 선택 완료: job=${jobId}, selected=${selectedIndex}, baseVideoId=${baseVideoId}`);
    return { selectedImageUrl: selectedUrl, baseVideoId };
  }

  /**
   * Kling 영상 생성 (Image to Video)
   * 선택된 스타트 프레임 이미지를 기반으로 베이스 영상 생성
   */
  async generateKlingVideo(userId: string, profileId: string, baseVideoId: string, imageUrl: string) {
    // 프로필 검증
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    // 베이스 영상 문서 검증
    const videoDoc = await db.collection('baseVideos').doc(baseVideoId).get();
    if (!videoDoc.exists || videoDoc.data()!.profileId !== profileId) {
      throw new AppError('베이스 영상을 찾을 수 없습니다.', 404);
    }

    // ★ imageUrl → base64 변환 (Kling은 로컬 URL 접근 불가)
    let klingImage: string;
    try {
      const rawBase64 = await resolveImageToBase64(imageUrl);
      const ext = imageUrl.toLowerCase();
      const mimeType = ext.includes('.png') ? 'image/png' : ext.includes('.webp') ? 'image/webp' : 'image/jpeg';
      klingImage = `data:${mimeType};base64,${rawBase64}`;
      logger.info(`Kling용 이미지 base64 변환 완료: ${imageUrl.substring(0, 60)}...`);
    } catch (convError) {
      logger.error(`이미지 base64 변환 실패 (baseVideo: ${baseVideoId}):`, convError);
      await db.collection('baseVideos').doc(baseVideoId).update({
        status: 'FAILED',
        error: '이미지를 변환할 수 없습니다.',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // ★ 크레딧 환불
      try {
        await creditService.refund(userId, CREDIT_COSTS.PROFILE_CREATE, 'AI 영상 생성 실패 환불 (이미지 변환 오류)', 'BASE_VIDEO', baseVideoId);
        logger.info(`크레딧 환불 완료: user=${userId}, amount=${CREDIT_COSTS.PROFILE_CREATE}C`);
      } catch (refundErr) {
        logger.error('크레딧 환불 실패:', refundErr);
      }
      throw new AppError('이미지를 변환할 수 없습니다.', 400);
    }

    // Kling API에 영상 생성 요청 (프롬프트는 prompts.secret.json에서 로드)
    const secretPrompts = loadPrompts();
    const prompt = secretPrompts.kling.imageToVideo.baseVideoPrompt;

    let klingResult;
    try {
      klingResult = await callKlingImageToVideo(klingImage, prompt);
    } catch (error) {
      logger.error(`Kling API 호출 실패 (baseVideo: ${baseVideoId}):`, error);
      await db.collection('baseVideos').doc(baseVideoId).update({
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Kling API 호출 실패',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // ★ 크레딧 환불
      try {
        await creditService.refund(userId, CREDIT_COSTS.PROFILE_CREATE, 'AI 영상 생성 실패 환불 (Kling API 오류)', 'BASE_VIDEO', baseVideoId);
        logger.info(`크레딧 환불 완료: user=${userId}, amount=${CREDIT_COSTS.PROFILE_CREATE}C`);
      } catch (refundErr) {
        logger.error('크레딧 환불 실패:', refundErr);
      }
      throw error;
    }

    // Firestore 업데이트: Kling task_id 저장
    await db.collection('baseVideos').doc(baseVideoId).update({
      status: 'PROCESSING',
      klingJobId: klingResult.taskId,
      klingTaskStatus: klingResult.taskStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Kling 영상 생성 시작: taskId=${klingResult.taskId}, baseVideo=${baseVideoId}`);

    // 비동기 폴링 시작 (userId 전달 — 실패 시 환불용)
    this._pollKlingVideoStatus(baseVideoId, klingResult.taskId, userId).catch((error) => {
      logger.error(`Kling 폴링 실패 (baseVideo: ${baseVideoId}):`, error);
    });

    return { baseVideoId, klingTaskId: klingResult.taskId, status: 'PROCESSING' };
  }

  /**
   * Kling 영상 생성 상태 폴링
   * 30초 간격으로 최대 30분간 체크
   */
  private async _pollKlingVideoStatus(baseVideoId: string, klingTaskId: string, userId?: string) {
    // Mock 모드: 4초 대기 후 즉시 COMPLETED 처리
    if (env.USE_MOCK_AI) {
      logger.info(`[MOCK MODE] Kling 폴링 스킵 → 4초 후 COMPLETED 처리 (baseVideo: ${baseVideoId})`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await db.collection('baseVideos').doc(baseVideoId).update({
        status: 'COMPLETED',
        videoUrl: '/uploads/mock/sample-video.mp4',
        gifUrl: null,
        klingTaskStatus: 'succeed',
        duration: '5',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info(`[MOCK MODE] 영상 COMPLETED 처리 완료: ${baseVideoId}`);
      return;
    }

    const maxAttempts = 60; // 30초 × 60 = 30분
    const pollInterval = 30000; // 30초

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      try {
        const result = await queryKlingVideoTask(klingTaskId);
        logger.info(`Kling 폴링 #${attempt + 1}: taskId=${klingTaskId}, status=${result.status}`);

        if (result.status === 'succeed') {
          // ★ Kling CDN 영상을 로컬로 다운로드 (CDN URL은 만료됨)
          let localVideoUrl = result.videoUrl || '';
          if (result.videoUrl) {
            try {
              const videoDir = path.join(process.cwd(), 'uploads', 'videos');
              if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
              const videoFilename = `${baseVideoId}.mp4`;
              const videoPath = path.join(videoDir, videoFilename);
              const videoResponse = await axios.get(result.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000, // 2분 타임아웃
              });
              fs.writeFileSync(videoPath, Buffer.from(videoResponse.data));
              localVideoUrl = `/uploads/videos/${videoFilename}`;
              logger.info(`Kling 영상 로컬 다운로드 완료: ${localVideoUrl} (${(videoResponse.data.byteLength / 1024 / 1024).toFixed(1)}MB)`);
            } catch (dlError) {
              logger.warn(`영상 다운로드 실패, CDN URL 유지 (만료 가능):`, dlError);
              localVideoUrl = result.videoUrl;
            }
          }

          // GIF 미리보기 생성 (실패해도 영상 저장은 정상 진행)
          let gifUrl: string | null = null;
          if (localVideoUrl) {
            try {
              // 로컬 파일이면 로컬 경로 사용, CDN URL이면 CDN 사용
              const gifSource = localVideoUrl.startsWith('/uploads/')
                ? path.join(process.cwd(), localVideoUrl.substring(1))
                : localVideoUrl;
              gifUrl = await gifService.generateFromVideo(
                gifSource,
                'gifs/base-videos',
                GIF_PRESETS.BASE_VIDEO
              );
            } catch (gifError) {
              logger.warn(`GIF 생성 실패 (baseVideo: ${baseVideoId}), 영상은 정상 저장:`, gifError);
            }
          }

          await db.collection('baseVideos').doc(baseVideoId).update({
            status: 'COMPLETED',
            videoUrl: localVideoUrl,
            gifUrl,
            klingTaskStatus: result.status,
            duration: result.duration,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          logger.info(`Kling 영상 생성 완료: baseVideo=${baseVideoId}, local=${localVideoUrl.startsWith('/uploads/')}, gifUrl=${gifUrl ? 'YES' : 'NULL'}`);
          return;
        }

        if (result.status === 'failed') {
          await db.collection('baseVideos').doc(baseVideoId).update({
            status: 'FAILED',
            klingTaskStatus: result.status,
            error: result.statusMsg || '영상 생성에 실패했습니다.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          // ★ 크레딧 환불 (Kling 영상 생성 실패)
          if (userId) {
            try {
              await creditService.refund(userId, CREDIT_COSTS.PROFILE_CREATE, 'AI 영상 생성 실패 환불 (Kling 실패)', 'BASE_VIDEO', baseVideoId);
              logger.info(`크레딧 환불 완료: user=${userId}, amount=${CREDIT_COSTS.PROFILE_CREATE}C (Kling 실패)`);
            } catch (refundErr) {
              logger.error('크레딧 환불 실패:', refundErr);
            }
          }
          logger.error(`Kling 영상 생성 실패: baseVideo=${baseVideoId}, msg=${result.statusMsg}`);
          return;
        }

        // submitted / processing - 계속 폴링
        await db.collection('baseVideos').doc(baseVideoId).update({
          klingTaskStatus: result.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error) {
        logger.warn(`Kling 폴링 오류 (attempt ${attempt + 1}):`, error);
      }
    }

    // 타임아웃
    await db.collection('baseVideos').doc(baseVideoId).update({
      status: 'FAILED',
      error: '영상 생성 시간이 초과되었습니다. (30분)',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // ★ 크레딧 환불 (타임아웃)
    if (userId) {
      try {
        await creditService.refund(userId, CREDIT_COSTS.PROFILE_CREATE, 'AI 영상 생성 실패 환불 (타임아웃)', 'BASE_VIDEO', baseVideoId);
        logger.info(`크레딧 환불 완료: user=${userId}, amount=${CREDIT_COSTS.PROFILE_CREATE}C (타임아웃)`);
      } catch (refundErr) {
        logger.error('크레딧 환불 실패:', refundErr);
      }
    }
    logger.error(`Kling 영상 생성 타임아웃: baseVideo=${baseVideoId}`);
  }

  /**
   * 작업 상태 조회 (스타트 프레임 또는 Kling 영상)
   */
  async getJobStatus(jobId: string) {
    // 1. 스타트 프레임 (Gemini) 작업 확인
    const sfJobDoc = await db.collection('startFrameJobs').doc(jobId).get();
    if (sfJobDoc.exists) {
      const data = sfJobDoc.data()!;
      return {
        type: 'start_frame',
        status: data.status,
        promptType: data.promptType,
        images: data.status === 'COMPLETED' ? JSON.parse(data.images as string) : null,
        selectedImageUrl: data.selectedImageUrl || null,
        error: data.error || null,
        expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
      };
    }

    // 2. Kling 영상 생성 작업 확인
    const videoSnap = await db.collection('baseVideos')
      .where('klingJobId', '==', jobId)
      .limit(1)
      .get();

    if (!videoSnap.empty) {
      const videoData = videoSnap.docs[0].data();

      // PROCESSING이면 Kling API 실시간 확인 (Mock 모드에서는 Firestore 데이터만 사용)
      if (videoData.status === 'PROCESSING' && !env.USE_MOCK_AI) {
        try {
          const liveStatus = await queryKlingVideoTask(jobId);
          return {
            type: 'kling_video',
            status: liveStatus.status === 'succeed' ? 'COMPLETED'
                   : liveStatus.status === 'failed' ? 'FAILED'
                   : 'PROCESSING',
            klingStatus: liveStatus.status,
            videoUrl: liveStatus.videoUrl,
            duration: liveStatus.duration,
            error: liveStatus.statusMsg,
          };
        } catch {
          // API 조회 실패 시 DB 데이터 반환
        }
      }

      return {
        type: 'kling_video',
        status: videoData.status,
        klingStatus: videoData.klingTaskStatus,
        videoUrl: videoData.videoUrl,
        duration: videoData.duration,
        error: videoData.error,
      };
    }

    // 3. 레거시: nanoBananaJobs 호환 (이전 버전)
    const nbJobDoc = await db.collection('nanoBananaJobs').doc(jobId).get();
    if (nbJobDoc.exists) {
      const data = nbJobDoc.data()!;
      return {
        type: 'gemini_image_legacy',
        status: data.status,
        images: data.status === 'COMPLETED' ? JSON.parse(data.images as string) : null,
        error: data.error || null,
        expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
      };
    }

    throw new AppError('작업을 찾을 수 없습니다.', 404);
  }
}

export const aiService = new AiService();
