/**
 * Dev Inspector API — 개발 환경에서만 활성화
 *
 * GET  /api/dev/file      — 소스 파일 읽기 (line 주변 ±10줄)
 * POST /api/dev/search    — 프론트엔드 소스에서 텍스트 검색
 * POST /api/dev/edit      — 소스 파일 find & replace 수정
 * POST /api/dev/request   — Claude에게 수정 요청 저장
 * GET  /api/dev/requests  — 대기 중인 수정 요청 읽기
 * POST /api/dev/requests/done — 요청 완료 처리
 */

import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const router = Router();

// ─── 보안 가드: 개발 환경 전용 ──────────────────────────────
router.use((_req: Request, res: Response, next) => {
  if (!env.isDev) {
    return res.status(403).json({
      success: false,
      message: 'Dev API는 개발 환경에서만 사용할 수 있습니다.',
    });
  }
  next();
});

// ─── 허용 경로 검증 ─────────────────────────────────────────
const PROJECT_ROOT = path.resolve(process.cwd(), '..', '..');
const ALLOWED_DIRS = [
  path.join(PROJECT_ROOT, 'apps'),
  path.join(PROJECT_ROOT, 'packages'),
];

// 수정 요청 저장 경로
const REQUESTS_DIR = path.join(PROJECT_ROOT, '.claude');
const REQUESTS_FILE = path.join(REQUESTS_DIR, 'dev-requests.json');

function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return ALLOWED_DIRS.some((dir) => resolved.startsWith(dir));
}

// ─── 요청 파일 헬퍼 ─────────────────────────────────────────
interface DevRequest {
  id: string;
  timestamp: string;
  element: {
    tagName: string;
    componentName: string;
    className: string;
    textContent: string;
    currentUrl: string;
    computedStyles?: Record<string, string>;
  };
  source: {
    filePath: string;
    lineNumber: number;
  } | null;
  request: string;
  status: 'pending' | 'done';
}

async function ensureRequestsDir() {
  try {
    await fs.mkdir(REQUESTS_DIR, { recursive: true });
  } catch {
    // 이미 존재
  }
}

async function readRequests(): Promise<DevRequest[]> {
  try {
    const content = await fs.readFile(REQUESTS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeRequests(requests: DevRequest[]) {
  await ensureRequestsDir();
  await fs.writeFile(REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf-8');
}

// ─── POST /api/dev/request — Claude에게 수정 요청 저장 ──────
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { element, source, request } = req.body as {
      element: DevRequest['element'];
      source: DevRequest['source'];
      request: string;
    };

    if (!request || !request.trim()) {
      return res.status(400).json({ success: false, message: '수정 요청 내용을 입력해주세요' });
    }

    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRequest: DevRequest = {
      id,
      timestamp: new Date().toISOString(),
      element,
      source,
      request: request.trim(),
      status: 'pending',
    };

    const requests = await readRequests();
    requests.unshift(newRequest);

    // 최대 50개만 유지
    const trimmed = requests.slice(0, 50);
    await writeRequests(trimmed);

    logger.info(`[DevAPI] 수정 요청 저장: ${id} — "${request.trim().slice(0, 50)}"`);

    res.json({
      success: true,
      message: '요청이 저장되었습니다. Claude에게 "수정 요청 확인해줘"라고 말씀하세요.',
      id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청 저장 실패';
    logger.error('[DevAPI] 요청 저장 오류:', message);
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/dev/requests — 대기 중인 수정 요청 읽기 ────────
router.get('/requests', async (_req: Request, res: Response) => {
  try {
    const requests = await readRequests();
    const pending = requests.filter((r) => r.status === 'pending');

    res.json({
      success: true,
      data: pending,
      total: requests.length,
      pending: pending.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청 읽기 실패';
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/dev/requests/done — 요청 완료 처리 ────────────
router.post('/requests/done', async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id: string };
    if (!id) {
      return res.status(400).json({ success: false, message: 'id가 필요합니다' });
    }

    const requests = await readRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '해당 요청을 찾을 수 없습니다' });
    }

    requests[idx].status = 'done';
    await writeRequests(requests);

    res.json({ success: true, message: '요청이 완료 처리되었습니다' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '처리 실패';
    res.status(500).json({ success: false, message });
  }
});

// ─── GET /api/dev/file — 소스 파일 읽기 ─────────────────────
router.get('/file', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const lineNumber = parseInt(req.query.line as string, 10) || 1;

    if (!filePath) {
      return res.status(400).json({ success: false, message: 'path 파라미터가 필요합니다' });
    }

    if (!isPathAllowed(filePath)) {
      return res.status(403).json({ success: false, message: '허용되지 않은 경로입니다' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const contextRange = 10;
    const start = Math.max(0, lineNumber - 1 - contextRange);
    const end = Math.min(lines.length, lineNumber - 1 + contextRange + 1);
    const contextLines = lines.slice(start, end);

    const numbered = contextLines.map((line, i) => {
      const num = start + i + 1;
      const marker = num === lineNumber ? '>>>' : '   ';
      return `${marker} ${String(num).padStart(4)} | ${line}`;
    });

    res.json({
      success: true,
      data: {
        filePath,
        lineNumber,
        totalLines: lines.length,
        content: numbered.join('\n'),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파일 읽기 실패';
    logger.error('[DevAPI] 파일 읽기 오류:', message);
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/dev/search — 텍스트로 소스 파일 검색 ──────────
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };

    if (!text || text.length < 2) {
      return res.status(400).json({ success: false, message: '검색어가 너무 짧습니다 (최소 2자)' });
    }

    const WEB_SRC = path.join(PROJECT_ROOT, 'apps', 'web', 'src');
    const results: { filePath: string; lineNumber: number; context: string }[] = [];

    async function searchDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          await searchDir(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(text)) {
                results.push({
                  filePath: fullPath,
                  lineNumber: i + 1,
                  context: lines[i].trim().slice(0, 100),
                });
                break;
              }
            }
          } catch {
            // 읽기 실패 무시
          }
        }
      }
    }

    await searchDir(WEB_SRC);

    res.json({ success: true, data: results.slice(0, 10) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '검색 실패';
    logger.error('[DevAPI] 검색 오류:', message);
    res.status(500).json({ success: false, message });
  }
});

// ─── POST /api/dev/edit — 소스 파일 수정 ────────────────────
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const { filePath, lineNumber, oldText, newText, editType } = req.body as {
      filePath: string;
      lineNumber: number;
      oldText: string;
      newText: string;
      editType: 'text' | 'style';
    };

    if (!filePath || !oldText || newText === undefined) {
      return res.status(400).json({
        success: false,
        message: 'filePath, oldText, newText가 필요합니다',
      });
    }

    if (!isPathAllowed(filePath)) {
      return res.status(403).json({ success: false, message: '허용되지 않은 경로입니다' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const searchRange = 15;
    const startLine = Math.max(0, lineNumber - 1 - searchRange);
    const endLine = Math.min(lines.length, lineNumber - 1 + searchRange + 1);

    let found = false;
    let updatedContent = content;

    if (editType === 'text') {
      const searchBlock = lines.slice(startLine, endLine).join('\n');
      const trimmedOld = oldText.trim();

      if (trimmedOld && searchBlock.includes(trimmedOld)) {
        const beforeRange = lines.slice(0, startLine).join('\n');
        const afterRange = lines.slice(endLine).join('\n');
        const updatedBlock = searchBlock.replace(trimmedOld, newText.trim());
        const parts = [beforeRange, updatedBlock, afterRange].filter(Boolean);
        updatedContent = parts.join('\n');
        found = true;
      } else {
        const quotedPatterns = [
          `"${trimmedOld}"`,
          `'${trimmedOld}'`,
          `\`${trimmedOld}\``,
          `>${trimmedOld}<`,
        ];
        for (const pattern of quotedPatterns) {
          if (searchBlock.includes(pattern)) {
            const replacement = pattern.startsWith('>')
              ? `>${newText.trim()}<`
              : `${pattern[0]}${newText.trim()}${pattern[pattern.length - 1]}`;
            const beforeRange = lines.slice(0, startLine).join('\n');
            const afterRange = lines.slice(endLine).join('\n');
            const updatedBlock = searchBlock.replace(pattern, replacement);
            const parts = [beforeRange, updatedBlock, afterRange].filter(Boolean);
            updatedContent = parts.join('\n');
            found = true;
            break;
          }
        }
      }
    } else if (editType === 'style') {
      const searchBlock = lines.slice(startLine, endLine).join('\n');
      const styleRegex = /style=\{\{([^}]*)\}\}|style="([^"]*)"/;
      const match = searchBlock.match(styleRegex);

      if (match && oldText) {
        const updatedBlock = searchBlock.replace(match[0], `style={{${newText}}}`);
        const beforeRange = lines.slice(0, startLine).join('\n');
        const afterRange = lines.slice(endLine).join('\n');
        const parts = [beforeRange, updatedBlock, afterRange].filter(Boolean);
        updatedContent = parts.join('\n');
        found = true;
      } else if (!oldText && newText) {
        const targetLine = lines[lineNumber - 1];
        if (targetLine) {
          const closingIdx = targetLine.indexOf('>');
          if (closingIdx !== -1) {
            lines[lineNumber - 1] =
              targetLine.slice(0, closingIdx) +
              ` style={{${newText}}}` +
              targetLine.slice(closingIdx);
            updatedContent = lines.join('\n');
            found = true;
          }
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        success: false,
        message: `라인 ${lineNumber} 주변에서 텍스트를 찾을 수 없습니다`,
      });
    }

    await fs.writeFile(filePath, updatedContent, 'utf-8');
    logger.info(`[DevAPI] 파일 수정: ${filePath}:${lineNumber} (${editType})`);

    res.json({
      success: true,
      message: `수정 완료 — ${shortPath(filePath)}:${lineNumber}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파일 수정 실패';
    logger.error('[DevAPI] 파일 수정 오류:', message);
    res.status(500).json({ success: false, message });
  }
});

function shortPath(fullPath: string): string {
  const idx = fullPath.indexOf('/apps/');
  return idx !== -1 ? fullPath.slice(idx + 1) : fullPath;
}

// ─── AI Test Endpoints ──────────────────────────────────────
// GET /api/dev/ai/config — 현재 AI 설정 확인
router.get('/ai/config', (_req: Request, res: Response) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const klingAccess = process.env.KLING_ACCESS_KEY;
  const klingSecret = process.env.KLING_SECRET_KEY;

  res.json({
    success: true,
    data: {
      mockMode: env.USE_MOCK_AI,
      gemini: {
        hasApiKey: !!geminiKey,
        apiKeyPreview: geminiKey ? `${geminiKey.slice(0, 8)}...${geminiKey.slice(-4)}` : 'NOT SET',
        model: process.env.GEMINI_MODEL || '(from prompts.secret.json)',
      },
      kling: {
        apiUrl: process.env.KLING_API_URL || 'https://api.klingai.com',
        hasAccessKey: !!klingAccess,
        accessKeyPreview: klingAccess ? `${klingAccess.slice(0, 8)}...${klingAccess.slice(-4)}` : 'NOT SET',
        hasSecretKey: !!klingSecret,
      },
      promptsFile: (() => {
        try {
          const p = path.join(process.cwd(), 'prompts.secret.json');
          const exists = require('fs').existsSync(p);
          if (!exists) return 'NOT FOUND';
          const raw = require('fs').readFileSync(p, 'utf-8');
          const parsed = JSON.parse(raw);
          return {
            exists: true,
            geminiModel: parsed.gemini?.model,
            klingModel: parsed.kling?.model,
            hasStartFrameBare: !!parsed.gemini?.startFrame?.bare,
            hasStartFrameOutfit: !!parsed.gemini?.startFrame?.outfit,
            hasBaseVideoPrompt: !!parsed.kling?.imageToVideo?.baseVideoPrompt,
            motionCount: Object.keys(parsed.kling?.imageToVideo?.motionPrompts || {}).length,
          };
        } catch (e) {
          return `ERROR: ${e instanceof Error ? e.message : 'unknown'}`;
        }
      })(),
    },
  });
});

// POST /api/dev/ai/test-gemini — Gemini API 테스트 (레퍼런스 이미지 지원)
router.post('/ai/test-gemini', async (req: Request, res: Response) => {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-image-preview';

    // 프롬프트 결정: 레퍼런스 이미지가 있으면 prompts.secret.json 사용
    let prompt = req.body.prompt || '';
    const referenceImage = req.body.referenceImage; // base64 (data:image/...;base64,xxx)

    if (!prompt) {
      if (referenceImage) {
        // prompts.secret.json에서 bare 프롬프트 로드
        try {
          const promptsPath = path.join(process.cwd(), 'prompts.secret.json');
          const raw = require('fs').readFileSync(promptsPath, 'utf-8');
          const prompts = JSON.parse(raw);
          prompt = prompts.gemini?.startFrame?.bare || '';
        } catch {}
      }
      if (!prompt) {
        prompt = 'Generate a simple image of a cute golden retriever puppy sitting on a pure black background. The puppy should be looking at the camera with a happy expression. Photorealistic style.';
      }
    }

    logger.info(`[AI Test] Gemini 테스트 시작: model=${model}, hasRef=${!!referenceImage}`);
    const startTime = Date.now();

    // contents 구성: 레퍼런스 이미지가 있으면 멀티모달
    const contentParts: any[] = [];
    if (referenceImage) {
      // data:image/jpeg;base64,xxx → base64 데이터만 추출
      const base64Match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        contentParts.push({
          inlineData: { mimeType: base64Match[1], data: base64Match[2] },
        });
      }
    }
    contentParts.push({ text: prompt });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: contentParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'] as any,
        imageConfig: { aspectRatio: '9:16' } as any,
      },
    });

    const elapsed = Date.now() - startTime;
    const candidates = (response as any).candidates;
    let imageFound = false;
    let savedUrl: string | null = null;
    let textResponse = '';

    if (candidates?.[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          imageFound = true;
          // 테스트 이미지 저장
          const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
          try { require('fs').mkdirSync(uploadsDir, { recursive: true }); } catch {}
          const filename = `gemini-test-${Date.now()}.png`;
          const filePath = path.join(uploadsDir, filename);
          require('fs').writeFileSync(filePath, Buffer.from(part.inlineData.data, 'base64'));
          savedUrl = `/uploads/test/${filename}`;
          logger.info(`[AI Test] Gemini 이미지 저장: ${savedUrl}`);
        }
        if (part.text) {
          textResponse += part.text;
        }
      }
    }

    res.json({
      success: true,
      data: {
        model,
        elapsed: `${elapsed}ms`,
        imageGenerated: imageFound,
        imageUrl: savedUrl,
        textResponse: textResponse || null,
        candidateCount: candidates?.length || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini 테스트 실패';
    logger.error('[AI Test] Gemini 오류:', error);
    res.status(500).json({ success: false, message, error: String(error) });
  }
});

// POST /api/dev/ai/test-kling — Kling API 단독 테스트
router.post('/ai/test-kling', async (req: Request, res: Response) => {
  try {
    const jwt = await import('jsonwebtoken');
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    const baseUrl = process.env.KLING_API_URL || 'https://api.klingai.com';

    if (!accessKey || !secretKey) {
      return res.status(400).json({ success: false, message: 'KLING_ACCESS_KEY / KLING_SECRET_KEY가 설정되지 않았습니다.' });
    }

    // JWT 생성
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.default.sign(
      { iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now },
      secretKey,
      { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
    );

    logger.info(`[AI Test] Kling JWT 생성 성공, API 연결 테스트...`);
    const startTime = Date.now();

    // imageUrl(로컬) 또는 imagePath가 제공되면 I2V 요청, 아니면 인증 테스트
    const imageUrl = req.body.imageUrl;
    const imagePath = req.body.imagePath; // /uploads/test/xxx.png 형태
    if (imageUrl || imagePath) {
      // 이미지를 base64로 변환
      let imageBase64 = '';
      const localPath = imagePath || (imageUrl?.startsWith('http://localhost') ? new URL(imageUrl).pathname : null);

      if (localPath) {
        // 로컬 파일 → base64
        const absPath = path.join(process.cwd(), localPath);
        try {
          const fileBuffer = require('fs').readFileSync(absPath);
          imageBase64 = fileBuffer.toString('base64');
          logger.info(`[AI Test] 로컬 이미지 base64 변환: ${absPath} (${fileBuffer.length} bytes)`);
        } catch (e) {
          return res.status(400).json({ success: false, message: `이미지 파일 읽기 실패: ${absPath}` });
        }
      } else if (imageUrl) {
        // 외부 URL → base64 (fetch 후 변환)
        try {
          const imgRes = await fetch(imageUrl);
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          imageBase64 = imgBuf.toString('base64');
        } catch (e) {
          return res.status(400).json({ success: false, message: `이미지 다운로드 실패: ${imageUrl}` });
        }
      }

      // 프롬프트 로드
      const promptsPath = path.join(process.cwd(), 'prompts.secret.json');
      let videoPrompt = 'The animal breathes gently with a calm, peaceful expression. Subtle natural movement. Black background.';
      let klingModel = 'kling-v3';
      try {
        const raw = require('fs').readFileSync(promptsPath, 'utf-8');
        const prompts = JSON.parse(raw);
        videoPrompt = prompts.kling?.imageToVideo?.baseVideoPrompt || videoPrompt;
        klingModel = prompts.kling?.model || klingModel;
      } catch {}

      // 모션 프롬프트 (요청에 motionType이 있으면 해당 모션 사용)
      const motionType = req.body.motionType;
      if (motionType) {
        try {
          const raw = require('fs').readFileSync(promptsPath, 'utf-8');
          const prompts = JSON.parse(raw);
          const motionPrompt = prompts.kling?.imageToVideo?.motionPrompts?.[motionType];
          if (motionPrompt) videoPrompt = motionPrompt;
        } catch {}
      }

      logger.info(`[AI Test] Kling I2V 요청: model=${klingModel}, base64=${imageBase64.length} chars`);

      const response = await fetch(`${baseUrl}/v1/videos/image2video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_name: klingModel,
          image: imageBase64,
          prompt: videoPrompt,
          mode: 'std',
          duration: '5',
          aspect_ratio: '9:16',
        }),
      });

      const elapsed = Date.now() - startTime;
      const result = await response.json() as any;

      res.json({
        success: result.code === 0,
        data: {
          type: 'image2video',
          elapsed: `${elapsed}ms`,
          model: klingModel,
          httpStatus: response.status,
          klingCode: result.code,
          klingMessage: result.message,
          taskId: result.data?.task_id,
          taskStatus: result.data?.task_status,
        },
      });
    } else {
      // 연결 테스트: 존재하지 않는 task 조회 → 인증 성공 여부 확인
      const response = await fetch(`${baseUrl}/v1/videos/image2video/test-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const elapsed = Date.now() - startTime;
      const result = await response.json() as any;

      // 404 = 인증 성공 + task 없음 (정상), 401/403 = 인증 실패
      const authOk = response.status !== 401 && response.status !== 403;

      res.json({
        success: authOk,
        data: {
          type: 'auth_check',
          elapsed: `${elapsed}ms`,
          httpStatus: response.status,
          authValid: authOk,
          klingCode: result.code,
          klingMessage: result.message,
          note: authOk ? 'JWT 인증 성공' : 'JWT 인증 실패 — API 키를 확인하세요',
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kling 테스트 실패';
    logger.error('[AI Test] Kling 오류:', error);
    res.status(500).json({ success: false, message, error: String(error) });
  }
});

// GET /api/dev/ai/test-kling/status/:taskId — Kling task 상태 조회
router.get('/ai/test-kling/status/:taskId', async (req: Request, res: Response) => {
  try {
    const jwt = await import('jsonwebtoken');
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    const baseUrl = process.env.KLING_API_URL || 'https://api.klingai.com';

    if (!accessKey || !secretKey) {
      return res.status(400).json({ success: false, message: 'Kling API 키 미설정' });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.default.sign(
      { iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now },
      secretKey,
      { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
    );

    const response = await fetch(`${baseUrl}/v1/videos/image2video/${req.params.taskId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });

    const result = await response.json() as any;
    const videoResult = result.data?.task_result?.videos?.[0];

    res.json({
      success: true,
      data: {
        taskStatus: result.data?.task_status,
        statusMsg: result.data?.task_status_msg,
        videoUrl: videoResult?.url,
        duration: videoResult?.duration,
        klingCode: result.code,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error) });
  }
});

export default router;
