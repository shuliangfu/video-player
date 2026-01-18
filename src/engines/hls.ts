/**
 * @module @dreamer/video-player/engines/hls
 *
 * @fileoverview HLS 流媒体播放器引擎
 *
 * 使用 hls.js 库支持 HLS (.m3u8) 格式和直播流。
 * 提供 HLS 流媒体的完整播放支持，包括自适应码率和低延迟模式。
 *
 * 主要功能：
 * - HLS 流媒体播放支持
 * - 自适应码率切换
 * - 低延迟直播模式
 * - 缓冲管理
 *
 * 注意：需要安装 hls.js 依赖
 * ```bash
 * deno add npm:hls.js@^1.4.12
 * ```
 *
 * @example
 * ```typescript
 * import { HLSPlayerEngine } from "jsr:@dreamer/video-player/engines/hls";
 *
 * const engine = new HLSPlayerEngine(videoElement, {
 *   lowLatencyMode: true,
 *   enableWorker: true
 * });
 *
 * engine.load("https://example.com/live.m3u8");
 * ```
 */

import { BasePlayerEngine } from "./base.ts";
// PlayerEvent is not used in hls engine

/**
 * HLS 配置选项
 */
export interface HLSConfig {
  /** 启用 Worker */
  enableWorker?: boolean;
  /** 低延迟模式 */
  lowLatencyMode?: boolean;
  /** 后缓冲长度（秒） */
  backBufferLength?: number;
  /** 最大缓冲长度（秒） */
  maxBufferLength?: number;
  /** 最大最大缓冲长度（秒） */
  maxMaxBufferLength?: number;
  /** 起始质量级别 */
  startLevel?: number;
  /** 根据播放器大小限制质量级别 */
  capLevelToPlayerSize?: boolean;
}

/**
 * HLS 播放器引擎
 *
 * 使用 hls.js 库支持 HLS 流媒体格式
 */
export class HLSPlayerEngine extends BasePlayerEngine {
  private hls: any = null; // Hls 实例
  private config: HLSConfig;

  /**
   * 创建 HLS 播放器引擎实例
   *
   * @param video - HTMLVideoElement 实例
   * @param config - HLS 配置选项
   */
  constructor(video: HTMLVideoElement, config: HLSConfig = {}) {
    super(video);
    this.config = {
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      capLevelToPlayerSize: true,
      ...config,
    };
    this.setupVideoEvents();
  }

  /**
   * 检查是否支持 HLS
   *
   * @returns 是否支持
   */
  static isSupported(): boolean {
    try {
      // 动态导入 hls.js
      // 注意：实际使用时需要确保 hls.js 已安装
      if (typeof window !== "undefined") {
        const globalWindow = window as any;
        if (globalWindow.Hls?.isSupported) {
          return globalWindow.Hls.isSupported();
        }
      }
      // 如果 hls.js 未加载，检查 Safari 原生支持
      return typeof document !== "undefined" &&
        document.createElement("video").canPlayType(
          "application/vnd.apple.mpegurl",
        ) !== "";
    } catch {
      // 如果 hls.js 未加载，检查 Safari 原生支持
      return typeof document !== "undefined" &&
        document.createElement("video").canPlayType(
          "application/vnd.apple.mpegurl",
        ) !== "";
    }
  }

  /**
   * 加载 HLS 视频源
   *
   * @param src - HLS 视频源 URL (.m3u8)
   */
  load(src: string): void {
    // 检查是否支持
    if (!HLSPlayerEngine.isSupported()) {
      // 降级到原生（Safari 原生支持 HLS）
      if (
        this.video.canPlayType("application/vnd.apple.mpegurl") !== ""
      ) {
        this.video.src = src;
        this.video.load();
        return;
      }
      throw new Error("HLS 格式不支持，请使用支持 HLS 的浏览器或安装 hls.js");
    }

    // 清理旧的 HLS 实例
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    try {
      // 动态导入 hls.js
      // 注意：实际使用时需要确保 hls.js 已安装并导入
      // import Hls from 'npm:hls.js@^1.4.12';
      // const Hls = window.Hls || (await import('npm:hls.js@^1.4.12')).default;

      // 这里使用全局 Hls（如果已加载）
      const Hls = (globalThis as any).Hls;
      if (!Hls) {
        throw new Error(
          "hls.js 未加载，请先安装并导入: deno add npm:hls.js@^1.4.12",
        );
      }

      if (Hls.isSupported()) {
        // 使用 hls.js
        this.hls = new Hls(this.config);
        this.hls.loadSource(src);
        this.hls.attachMedia(this.video);

        // HLS 事件监听
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.emit("loadedmetadata");
        });

              this.hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (this.hls) {
                  this.hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                if (this.hls) {
                  this.hls.recoverMediaError();
                }
                break;
              default:
                if (this.hls) {
                  this.hls.destroy();
                }
                this.emit("error", data);
                break;
            }
          }
        });
      } else {
        // 降级到原生
        this.video.src = src;
        this.video.load();
      }
    } catch (error) {
      // 降级到原生
      console.warn("[HLSPlayerEngine] 使用 hls.js 失败，降级到原生:", error);
      this.video.src = src;
      this.video.load();
    }
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
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.video.pause();
    this.video.src = "";
    this.video.load();
    this.eventListeners.clear();
  }
}
