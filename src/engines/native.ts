/**
 * @module @dreamer/video-player/engines/native
 *
 * @fileoverview 原生 HTML5 视频播放器引擎
 *
 * 使用浏览器原生 video 元素播放 MP4, WebM, OGG 等格式。
 * 这是最基础的播放器引擎，用于播放浏览器原生支持的格式。
 *
 * 主要功能：
 * - 原生格式播放支持（MP4、WebM、OGG、AV1）
 * - 浏览器原生 API 封装
 * - 降级策略支持
 *
 * @example
 * ```typescript
 * import { NativePlayerEngine } from "jsr:@dreamer/video-player/engines/native";
 *
 * const engine = new NativePlayerEngine(videoElement);
 * engine.load("https://example.com/video.mp4");
 * ```
 */

import { BasePlayerEngine } from "./base.ts";
// PlayerEvent is not used in native engine

/**
 * 原生 HTML5 视频播放器引擎
 *
 * 使用浏览器原生 video 元素，支持 MP4, WebM, OGG, AV1 等格式
 */
export class NativePlayerEngine extends BasePlayerEngine {
  /**
   * 创建原生播放器引擎实例
   *
   * @param video - HTMLVideoElement 实例
   */
  constructor(video: HTMLVideoElement) {
    super(video);
    this.setupVideoEvents();
  }

  /**
   * 加载视频源
   *
   * @param src - 视频源 URL
   */
  load(src: string): void {
    this.video.src = src;
    this.video.load();
  }

  /**
   * 播放视频
   *
   * @returns Promise<void>
   */
  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * 暂停视频
   */
  pause(): void {
    this.video.pause();
  }

  /**
   * 跳转到指定时间
   *
   * @param time - 时间（秒）
   */
  seek(time: number): void {
    this.video.currentTime = Math.max(0, Math.min(time, this.getDuration()));
  }

  /**
   * 设置音量
   *
   * @param volume - 音量 (0-1)
   */
  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 设置播放速度
   *
   * @param rate - 播放速度 (0.25-4)
   */
  setPlaybackRate(rate: number): void {
    this.video.playbackRate = Math.max(0.25, Math.min(4, rate));
  }

  /**
   * 销毁播放器引擎
   */
  destroy(): void {
    this.video.pause();
    this.video.src = "";
    this.video.load();
    this.eventListeners.clear();
  }
}
