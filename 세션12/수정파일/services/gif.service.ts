import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

// ffmpeg 바이너리 경로 설정
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface GifOptions {
  width: number;       // 출력 너비 (px)
  height: number;      // 출력 높이 (px)
  duration: number;    // 캡처할 초 수 (영상 시작부터)
  fps: number;         // 프레임/초
}

/**
 * GIF 프리셋
 * - BASE_VIDEO: 베이스 영상 카드 (80x108 CSS → 160x216 레티나)
 * - MOTION: 모션 카드 (1:1 정사각 아이콘)
 */
export const GIF_PRESETS = {
  BASE_VIDEO: { width: 160, height: 216, duration: 3, fps: 10 } as GifOptions,
  MOTION: { width: 120, height: 120, duration: 2, fps: 10 } as GifOptions,
} as const;

/**
 * URL 프로토콜 검증 (SSRF 방지)
 */
function validateVideoUrl(url: string): void {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('허용되지 않은 URL 프로토콜입니다.', 400);
  }
}

class GifService {
  /**
   * 영상 URL에서 GIF 생성 → S3 업로드 → URL 반환
   *
   * ffmpeg 2-pass 팔레트 최적화:
   * 1) 영상에서 최적 팔레트 추출
   * 2) 팔레트 적용하여 고품질 GIF 생성
   */
  async generateFromVideo(
    videoUrl: string,
    folder: string,
    options: GifOptions
  ): Promise<string> {
    validateVideoUrl(videoUrl);

    const tmpDir = os.tmpdir();
    const id = uuidv4();
    const palettePath = path.join(tmpDir, `${id}_palette.png`);
    const gifPath = path.join(tmpDir, `${id}.gif`);

    try {
      // Pass 1: 팔레트 생성
      await this._generatePalette(videoUrl, palettePath, options);

      // Pass 2: 팔레트로 GIF 생성
      await this._generateGifWithPalette(videoUrl, palettePath, gifPath, options);

      // GIF 파일 읽기
      const gifBuffer = fs.readFileSync(gifPath);

      // S3 업로드
      const result = await storageService.upload(
        gifBuffer,
        `${id}.gif`,
        folder,
        'image/gif'
      );

      logger.info(`GIF 생성 완료: ${result.url} (${(gifBuffer.length / 1024).toFixed(1)}KB)`);
      return result.url;
    } finally {
      // 임시 파일 정리
      this._cleanup(palettePath);
      this._cleanup(gifPath);
    }
  }

  /**
   * Pass 1: 영상에서 최적 팔레트 추출 (60초 타임아웃)
   */
  private _generatePalette(
    inputUrl: string,
    outputPath: string,
    options: GifOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const filterComplex =
        `[0:v] trim=duration=${options.duration},` +
        `fps=${options.fps},` +
        `scale=${options.width}:${options.height}:flags=lanczos,` +
        `palettegen=stats_mode=diff [palette]`;

      const command = ffmpeg(inputUrl)
        .complexFilter(filterComplex)
        .outputOptions(['-map', '[palette]'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          logger.error('ffmpeg 팔레트 생성 실패:', err);
          reject(err);
        });

      command.run();

      // 60-second timeout
      setTimeout(() => {
        try { command.kill('SIGKILL'); } catch { /* ignore */ }
        reject(new AppError('ffmpeg 팔레트 생성 타임아웃 (60초)', 500));
      }, 60_000);
    });
  }

  /**
   * Pass 2: 팔레트를 사용한 고품질 GIF 생성 (60초 타임아웃)
   */
  private _generateGifWithPalette(
    inputUrl: string,
    palettePath: string,
    outputPath: string,
    options: GifOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const filterComplex =
        `[0:v] trim=duration=${options.duration},` +
        `fps=${options.fps},` +
        `scale=${options.width}:${options.height}:flags=lanczos [scaled];` +
        `[scaled][1:v] paletteuse=dither=sierra2_4a`;

      const command = ffmpeg()
        .input(inputUrl)
        .input(palettePath)
        .complexFilter(filterComplex)
        .outputOptions(['-loop', '0'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          logger.error('ffmpeg GIF 생성 실패:', err);
          reject(err);
        });

      command.run();

      // 60-second timeout
      setTimeout(() => {
        try { command.kill('SIGKILL'); } catch { /* ignore */ }
        reject(new AppError('ffmpeg GIF 생성 타임아웃 (60초)', 500));
      }, 60_000);
    });
  }

  /**
   * 임시 파일 삭제
   */
  private _cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn(`임시 파일 정리 실패: ${filePath}`, err);
    }
  }
}

export const gifService = new GifService();
