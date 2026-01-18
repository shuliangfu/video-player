/**
 * @module @dreamer/video-player/engines/flv
 *
 * @fileoverview FLV 格式播放器引擎
 *
 * 使用 flv.js 库支持 FLV 格式和 HTTP-FLV 流。
 * 提供 FLV 格式的完整播放支持，包括 HTTP-FLV 流媒体。
 *
 * 主要功能：
 * - FLV 格式播放支持
 * - HTTP-FLV 流媒体支持
 * - RTMP 转 HTTP-FLV
 * - 缓冲管理
 *
 * 注意：需要安装 flv.js 依赖
 * ```bash
 * deno add npm:flv.js@^1.6.2
 * ```
 *
 * @example
 * ```typescript
 * import { FLVPlayerEngine } from "jsr:@dreamer/video-player/engines/flv";
 *
 * const engine = new FLVPlayerEngine(videoElement, {
 *   enableWorker: true,
 *   enableStashBuffer: false
 * });
 *
 * engine.load("https://example.com/video.flv");
 * ```
 */

import { BasePlayerEngine } from "./base.ts";
// PlayerEvent is not used in flv engine

/**
 * FLV 配置选项
 */
export interface FLVConfig {
  /** 是否启用 Worker */
  enableWorker?: boolean;
  /** 是否启用 Stash */
  enableStashBuffer?: boolean;
  /** Stash 初始大小（字节） */
  stashInitialSize?: number;
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 是否启用自动重连（默认：true） */
  autoReconnect?: boolean;
  /** 最大重连次数（默认：5） */
  maxReconnectAttempts?: number;
  /** 重连延迟（毫秒，默认：3000） */
  reconnectDelay?: number;
  /** 其他 flv.js 配置选项 */
  [key: string]: any;
}

/**
 * FLV 播放器引擎
 *
 * 使用 flv.js 库支持 FLV 格式
 */
export class FLVPlayerEngine extends BasePlayerEngine {
  private player: any = null; // flvjs Player 实例
  private config: FLVConfig;
  /** 当前视频源 URL */
  private currentSrc?: string;
  /** 是否是从 RTMP 转换的 */
  private isRTMPConverted: boolean = false;
  /** 原始 RTMP URL（如果是从 RTMP 转换的） */
  private originalRTMPUrl?: string;
  /** 重连次数 */
  private reconnectCount: number = 0;
  /** 最大重连次数 */
  private maxReconnectAttempts: number = 5;
  /** 重连定时器 */
  private reconnectTimer?: number;
  /** 连接状态 */
  private connectionStatus:
    | "connected"
    | "disconnected"
    | "connecting"
    | "error" = "disconnected";

  /**
   * 创建 FLV 播放器引擎实例
   *
   * @param video - HTMLVideoElement 实例
   * @param config - FLV 配置选项
   */
  constructor(video: HTMLVideoElement, config: FLVConfig = {}) {
    super(video);
    this.config = {
      enableWorker: true,
      enableStashBuffer: true,
      stashInitialSize: 128 * 1024,
      autoPlay: false,
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
      ...config,
    };
    this.maxReconnectAttempts = this.config.maxReconnectAttempts ?? 5;
    this.setupVideoEvents();
  }

  /**
   * 检查是否支持 FLV
   *
   * @returns 是否支持
   */
  static isSupported(): boolean {
    try {
      const flvjs = (globalThis as any).flvjs;
      return flvjs !== undefined && flvjs.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * 加载 FLV 视频源
   *
   * @param src - FLV 视频源 URL (.flv)
   */
  load(src: string): void {
    // 检查是否支持
    if (!FLVPlayerEngine.isSupported()) {
      throw new Error(
        "FLV 格式不支持，请安装 flv.js: deno add npm:flv.js@^1.6.2",
      );
    }

    // 如果 src 是 RTMP URL，尝试转换为 HTTP-FLV
    let actualSrc = src;
    if (src.startsWith("rtmp://") || src.startsWith("rtmps://")) {
      const httpFlvUrl = this.convertRTMPToHTTPFLV(src);
      if (httpFlvUrl) {
        console.warn(
          `[FLVPlayerEngine] RTMP URL 已转换为 HTTP-FLV: ${httpFlvUrl}`,
        );
        actualSrc = httpFlvUrl;
        this.isRTMPConverted = true;
        this.originalRTMPUrl = src;
      } else {
        throw new Error(
          "RTMP 格式无法在浏览器直接播放，请使用 HTTP-FLV URL",
        );
      }
    } else {
      this.isRTMPConverted = false;
      this.originalRTMPUrl = undefined;
    }

    this.currentSrc = actualSrc;
    this.reconnectCount = 0;

    // 清理旧的播放器实例
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    try {
      // 动态导入 flv.js
      const flvjs = (globalThis as any).flvjs;
      if (!flvjs) {
        throw new Error(
          "flv.js 未加载，请先安装并导入: deno add npm:flv.js@^1.6.2",
        );
      }

      // 创建 flv.js 播放器
      this.player = flvjs.createPlayer({
        type: "flv",
        url: actualSrc,
        isLive: actualSrc.includes("live") || actualSrc.includes("stream"),
        ...this.config,
      });

      this.player.attachMediaElement(this.video);
      this.player.load();

      // 监听事件
      this.player.on(flvjs.Events.LOADING_COMPLETE, () => {
        this.connectionStatus = "connected";
        this.reconnectCount = 0; // 重置重连计数
        this.emit("loadedmetadata");
        this.emit("connectionstatuschange", { status: "connected" });
      });

      // 监听网络状态变化
      if (flvjs.Events.NETWORK_STATUS) {
        this.player.on(
          flvjs.Events.NETWORK_STATUS,
          (status: any) => {
            this.handleNetworkStatus(status);
          },
        );
      }

      // 监听错误事件
      this.player.on(
        flvjs.Events.ERROR,
        (errorType: string, errorDetail: any) => {
          this.handleError(errorType, errorDetail);
        },
      );

      // 监听媒体信息
      if (flvjs.Events.MEDIA_INFO) {
        this.player.on(flvjs.Events.MEDIA_INFO, (info: any) => {
          this.connectionStatus = "connected";
          this.emit("connectionstatuschange", { status: "connected", info });
        });
      }

      this.connectionStatus = "connecting";
      this.emit("connectionstatuschange", { status: "connecting" });
    } catch (error) {
      console.error("[FLVPlayerEngine] 加载失败:", error);
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
    // FLV 流媒体可能不支持跳转
    if (this.player && typeof this.player.currentTime !== "undefined") {
      this.video.currentTime = Math.max(0, Math.min(time, this.getDuration()));
    }
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
   * 将 RTMP URL 转换为 HTTP-FLV URL
   *
   * @private
   * @param rtmpUrl - RTMP URL
   * @returns HTTP-FLV URL 或 null
   */
  private convertRTMPToHTTPFLV(rtmpUrl: string): string | null {
    try {
      // 将 rtmp:// 或 rtmps:// 转换为 http:// 或 https://
      const httpUrl = rtmpUrl
        .replace(/^rtmp:\/\//, "http://")
        .replace(/^rtmps:\/\//, "https://");

      // 如果 URL 不以 .flv 结尾，添加 .flv
      if (!httpUrl.endsWith(".flv")) {
        // 提取路径部分
        const url = new URL(httpUrl);
        const pathname = url.pathname;
        if (!pathname.endsWith(".flv")) {
          // 提取流名称
          const streamName = pathname.split("/").pop() || "stream";
          url.pathname = pathname.replace(/\/[^/]+$/, `/${streamName}.flv`);
          return url.toString();
        }
      }

      return httpUrl;
    } catch {
      return null;
    }
  }

  /**
   * 处理网络状态
   *
   * @private
   * @param status - 网络状态
   */
  private handleNetworkStatus(status: any): void {
    if (status && status.networkState !== undefined) {
      // networkState: 0 = NETWORK_EMPTY, 1 = NETWORK_IDLE, 2 = NETWORK_LOADING, 3 = NETWORK_NO_SOURCE
      if (status.networkState === 3) {
        // 网络无源，可能连接断开
        this.connectionStatus = "disconnected";
        this.emit("connectionstatuschange", { status: "disconnected" });
        this.attemptReconnect();
      } else if (status.networkState === 2) {
        // 正在加载
        this.connectionStatus = "connecting";
        this.emit("connectionstatuschange", { status: "connecting" });
      } else if (status.networkState === 1) {
        // 空闲，连接正常
        this.connectionStatus = "connected";
        this.emit("connectionstatuschange", { status: "connected" });
      }
    }
  }

  /**
   * 处理错误事件
   *
   * @private
   * @param errorType - 错误类型
   * @param errorDetail - 错误详情
   */
  private handleError(errorType: string, errorDetail: any): void {
    this.connectionStatus = "error";
    this.emit("connectionstatuschange", {
      status: "error",
      errorType,
      errorDetail,
    });

    // 如果是网络错误且启用自动重连，尝试重连
    if (
      this.config.autoReconnect &&
      (errorType === "NetworkError" || errorType === "NetworkException")
    ) {
      this.attemptReconnect();
    } else {
      this.emit("error", { type: errorType, detail: errorDetail });
    }
  }

  /**
   * 尝试重连
   *
   * @private
   */
  private attemptReconnect(): void {
    if (!this.config.autoReconnect || !this.currentSrc) {
      return;
    }

    if (this.reconnectCount >= this.maxReconnectAttempts) {
      console.error(
        `[FLVPlayerEngine] 已达到最大重连次数 (${this.maxReconnectAttempts})，停止重连`,
      );
      this.connectionStatus = "error";
      this.emit("connectionstatuschange", {
        status: "error",
        message: "已达到最大重连次数",
      });
      return;
    }

    this.reconnectCount++;
    const delay = this.config.reconnectDelay ?? 3000;

    console.log(
      `[FLVPlayerEngine] ${delay}ms 后进行第 ${this.reconnectCount}/${this.maxReconnectAttempts} 次重连...`,
    );

    this.connectionStatus = "connecting";
    this.emit("connectionstatuschange", {
      status: "connecting",
      reconnectCount: this.reconnectCount,
    });

    // 清除之前的重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      try {
        // 重新加载视频源
        if (this.player) {
          this.player.unload();
          this.player.detachMediaElement();
          this.player.destroy();
          this.player = null;
        }

        // 重新加载
        this.load(this.currentSrc!);
      } catch (error) {
        console.error("[FLVPlayerEngine] 重连失败:", error);
        this.attemptReconnect(); // 继续尝试重连
      }
    }, delay) as unknown as number;
  }

  /**
   * 获取连接状态
   *
   * @returns 连接状态
   */
  getConnectionStatus(): "connected" | "disconnected" | "connecting" | "error" {
    return this.connectionStatus;
  }

  /**
   * 获取重连次数
   *
   * @returns 重连次数
   */
  getReconnectCount(): number {
    return this.reconnectCount;
  }

  /**
   * 手动触发重连
   */
  reconnect(): void {
    this.reconnectCount = 0; // 重置计数
    if (this.currentSrc) {
      this.attemptReconnect();
    }
  }

  /**
   * 销毁播放器引擎
   */
  destroy(): void {
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.player) {
      this.player.pause();
      this.player.unload();
      this.player.detachMediaElement();
      this.player.destroy();
      this.player = null;
    }
    this.video.pause();
    this.video.src = "";
    this.video.load();
    this.eventListeners.clear();
    this.connectionStatus = "disconnected";
  }
}
