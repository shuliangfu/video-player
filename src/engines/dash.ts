/**
 * @module @dreamer/video-player/engines/dash
 *
 * @fileoverview DASH 流媒体播放器引擎
 *
 * 使用 dashjs 库支持 DASH (.mpd) 格式和自适应码率流。
 * 提供 DASH 流媒体的完整播放支持，包括自适应码率切换。
 *
 * 主要功能：
 * - DASH 流媒体播放支持
 * - 自适应码率切换
 * - 直播延迟控制
 * - 缓冲管理
 *
 * 注意：需要安装 dashjs 依赖
 * ```bash
 * deno add npm:dashjs@^4.7.4
 * ```
 *
 * @example
 * ```typescript
 * import { DASHPlayerEngine } from "jsr:@dreamer/video-player/engines/dash";
 *
 * const engine = new DASHPlayerEngine(videoElement, {
 *   streaming: {
 *     delay: { liveDelay: 3 }
 *   }
 * });
 *
 * engine.load("https://example.com/video.mpd");
 * ```
 */

import { BasePlayerEngine } from "./base.ts";
// PlayerEvent is not used in dash engine

/**
 * DASH 配置选项
 */
export interface DASHConfig {
  /** 流媒体配置 */
  streaming?: {
    delay?: {
      /** 直播延迟（秒） */
      liveDelay?: number;
      /** 直播延迟片段数 */
      liveDelayFragmentCount?: number;
    };
  };
  /** 自适应码率配置 */
  abr?: {
    autoSwitchBitrate?: {
      /** 视频自动切换码率 */
      video?: boolean;
      /** 音频自动切换码率 */
      audio?: boolean;
    };
  };
  /** 其他 dashjs 配置选项 */
  [key: string]: any;
}

/**
 * DASH 播放器引擎
 *
 * 使用 dashjs 库支持 DASH 流媒体格式
 */
export class DASHPlayerEngine extends BasePlayerEngine {
  private player: any = null; // dashjs MediaPlayer 实例
  private config: DASHConfig;

  /**
   * 创建 DASH 播放器引擎实例
   *
   * @param video - HTMLVideoElement 实例
   * @param config - DASH 配置选项
   */
  constructor(video: HTMLVideoElement, config: DASHConfig = {}) {
    super(video);
    this.config = {
      streaming: {
        delay: {
          liveDelay: 3,
          liveDelayFragmentCount: 3,
        },
      },
      abr: {
        autoSwitchBitrate: {
          video: true,
          audio: true,
        },
      },
      ...config,
    };
    this.setupVideoEvents();
  }

  /**
   * 检查是否支持 DASH
   *
   * @returns 是否支持
   */
  static isSupported(): boolean {
    try {
      // 检查 dashjs 是否可用
      const dashjs = (globalThis as any).dashjs;
      return dashjs !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * 加载 DASH 视频源
   *
   * @param src - DASH 视频源 URL (.mpd)
   */
  load(src: string): void {
    // 检查是否支持
    if (!DASHPlayerEngine.isSupported()) {
      throw new Error(
        "DASH 格式不支持，请安装 dashjs: deno add npm:dashjs@^4.7.4",
      );
    }

    // 清理旧的播放器实例
    if (this.player) {
      this.player.reset();
      this.player = null;
    }

    try {
      // 动态导入 dashjs
      const dashjs = (globalThis as any).dashjs;
      if (!dashjs) {
        throw new Error(
          "dashjs 未加载，请先安装并导入: deno add npm:dashjs@^4.7.4",
        );
      }

      // 创建 dashjs 播放器
      this.player = dashjs.MediaPlayer().create();
      this.player.initialize(this.video, src, false);

      // 应用配置
      if (this.config.streaming) {
        this.player.updateSettings({
          streaming: this.config.streaming,
        });
      }

      if (this.config.abr) {
        this.player.updateSettings({
          abr: this.config.abr,
        });
      }

      // 监听事件
      this.player.on("streamInitialized", () => {
        this.emit("loadedmetadata");
      });

      this.player.on("error", (error: any) => {
        this.emit("error", error);
      });

      this.player.on("playbackStarted", () => {
        this.emit("play");
      });

      this.player.on("playbackPaused", () => {
        this.emit("pause");
      });
    } catch (error) {
      console.error("[DASHPlayerEngine] 加载失败:", error);
      this.emit("error", error);
      throw error;
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
    if (this.player) {
      this.player.reset();
      this.player.destroy();
      this.player = null;
    }
    this.video.pause();
    this.video.src = "";
    this.video.load();
    this.eventListeners.clear();
  }
}
