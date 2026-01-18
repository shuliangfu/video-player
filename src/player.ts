/**
 * @module @dreamer/video-player/player
 *
 * @fileoverview 全能视频播放器核心类
 *
 * 支持多种视频格式和流媒体的完整播放器实现。
 * 这是视频播放器的核心类，提供统一的 API 接口。
 *
 * 主要功能：
 * - 自动格式检测和引擎选择
 * - 播放控制（播放、暂停、跳转等）
 * - 音量、速度、质量控制
 * - 播放列表管理
 * - 事件系统
 * - 高级功能（画中画、截图、下载等）
 *
 * @example
 * ```typescript
 * import { VideoPlayer } from "jsr:@dreamer/video-player";
 *
 * const player = new VideoPlayer({
 *   container: "#video-container",
 *   src: "https://example.com/video.mp4"
 * });
 *
 * player.on("play", () => {
 *   console.log("开始播放");
 * });
 *
 * await player.play();
 * ```
 */

import { BasePlayerEngine } from "./engines/base.ts";
import {
  type PlayerEngineConfig,
  PlayerEngineFactory,
} from "./engines/factory.ts";
import type {
  DownloadProgress,
  EventCallback,
  EventData,
  FullscreenDocument,
  NetworkRequestStats,
  PerformanceData,
  PlaybackStats,
  PlayerEvent,
  PlayerState,
  PlaylistItem,
  QualityLevel,
  SubtitleStyle,
  SubtitleTrack,
  VideoPlayerOptions,
} from "./types.ts";
import {
  detectVideoFormat,
  getRecommendedFormats,
  VideoFormat,
} from "./utils/format-detector.ts";
import { logger, LogLevel } from "./utils/logger.ts";
import { getNetworkStatus, type NetworkInfo } from "./utils/network.ts";
import {
  type PlaybackHistory,
  type PlayerSettings,
  StorageManager,
} from "./utils/storage.ts";
import { debounce, throttle } from "./utils/throttle.ts";

/**
 * 从 VideoPlayerOptions 中提取引擎配置的辅助类型
 */
type EngineConfigFromOptions = Pick<
  VideoPlayerOptions,
  "hls" | "dash" | "flv" | "autoDetectFormat" | "fallbackToNative"
>;

/**
 * 全能视频播放器类
 *
 * 支持多种视频格式和流媒体：
 * - 原生格式：MP4, WebM, OGG
 * - 流媒体：HLS (.m3u8), DASH (.mpd)
 * - 其他格式：FLV (.flv)
 * - 自动格式检测和引擎选择
 * - 降级策略确保兼容性
 * - 性能优化（事件节流、内存管理）
 * - 高级功能（画中画、截图、质量切换、播放历史）
 *
 * @example
 * ```typescript
 * // 自动检测格式并选择引擎
 * const player = new VideoPlayer({
 *   container: "#video-container",
 *   src: "https://example.com/live.m3u8", // 自动使用 HLS 引擎
 *   hls: { lowLatencyMode: true },
 *   enablePlaybackHistory: true,  // 启用断点续播
 *   saveSettings: true,            // 保存设置
 *   preloadStrategy: "smart",      // 智能预加载
 * });
 *
 * player.on("play", () => {
 *   console.log("开始播放");
 * });
 *
 * player.play();
 * ```
 */
export class VideoPlayer {
  /** 视频元素 */
  private video: HTMLVideoElement;
  /** 容器元素 */
  private container: HTMLElement;
  /** 播放器引擎 */
  private engine?: BasePlayerEngine;
  /** 播放器配置选项 */
  private options: VideoPlayerOptions;
  /** 事件监听器映射 */
  private eventListeners: Map<PlayerEvent, EventCallback[]> = new Map();
  /** 播放列表 */
  private playlist: PlaylistItem[] = [];
  /** 当前播放列表索引 */
  private playlistIndex: number = -1;
  /** 播放列表循环模式 */
  private playlistLoop: "none" | "one" | "all" = "none";
  /** 播放列表是否随机播放 */
  private playlistShuffle: boolean = false;
  /** 随机播放时的原始顺序（用于恢复） */
  private playlistOriginalOrder: PlaylistItem[] = [];
  /** 是否启用键盘快捷键 */
  private keyboardShortcuts: boolean = true;
  /** 键盘事件处理器 */
  private keyboardHandler?: (e: KeyboardEvent) => void;
  /** 当前视频源 */
  private currentSrc?: string;
  /** 当前视频格式 */
  private currentFormat?: VideoFormat;
  /** 播放统计信息 */
  private stats: PlaybackStats = {
    totalPlayTime: 0,
    totalBufferingTime: 0,
    bufferingCount: 0,
    errorCount: 0,
  };
  /** 性能监控数据 */
  private performanceData: {
    fps: number;
    droppedFrames: number;
    bufferingEfficiency: number;
    networkRequests: number;
    lastUpdateTime: number;
  } = {
    fps: 0,
    droppedFrames: 0,
    bufferingEfficiency: 0,
    networkRequests: 0,
    lastUpdateTime: Date.now(),
  };
  /** FPS 监控定时器 */
  private fpsMonitorTimer?: number;
  /** 性能监控定时器 */
  private performanceMonitorTimer?: number;
  /** 质量自动切换定时器 */
  private qualitySwitchTimer?: number;
  /** 事件日志 */
  private eventLog: Array<
    { time: number; event: PlayerEvent; data?: EventData }
  > = [];
  /** 最大事件日志数量 */
  private maxEventLogSize: number = 100;
  /** 网络请求统计 */
  private networkRequestStats: NetworkRequestStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalBytesDownloaded: 0,
    averageSpeed: 0,
    requestTimestamps: [],
  };
  /** 播放开始时间戳 */
  private playStartTime?: number;
  /** 缓冲开始时间戳 */
  private bufferingStartTime?: number;
  /** 节流后的 timeupdate 处理器 */
  private throttledTimeUpdate?: () => void;
  /** 防抖后的 volumechange 处理器 */
  private debouncedVolumeChange?: () => void;
  /** 画中画状态 */
  private isPictureInPicture: boolean = false;
  /** 是否启用播放历史 */
  private enablePlaybackHistory: boolean = false;
  /** 是否保存设置 */
  private saveSettings: boolean = false;
  /** 预加载定时器 */
  private preloadTimer?: number;
  /** 播放位置保存定时器 */
  private positionSaveTimer?: number;
  /** 网络状态信息 */
  private networkInfo?: NetworkInfo;
  /** 网络状态监听器 */
  private networkChangeHandler?: () => void;
  /** 节流后的 seeking 处理器 */
  private throttledSeeking?: () => void;
  /** 是否启用调试模式 */
  private debug: boolean = false;
  /** 错误重试计数器 */
  private retryCount: number = 0;
  /** 最大重试次数 */
  private maxRetries: number = 3;
  /** 引擎事件处理器映射（用于清理） */
  private engineEventHandlers: Map<PlayerEvent, EventCallback[]> = new Map();
  /** 是否已设置引擎事件 */
  private engineEventsSetup: boolean = false;

  /**
   * 创建视频播放器实例
   *
   * @param options - 播放器配置选项
   */
  constructor(options: VideoPlayerOptions) {
    this.options = options;
    this.debug = options.debug === true;
    this.maxRetries = options.maxRetries ?? 3;

    // 设置日志级别
    if (this.debug) {
      logger.setLevel(LogLevel.DEBUG);
    } else {
      logger.setLevel(LogLevel.WARN);
    }

    // 初始化网络状态检测
    this.networkInfo = getNetworkStatus();
    this.setupNetworkMonitoring();

    // 获取或创建容器
    if (typeof options.container === "string") {
      const element = document.querySelector(options.container);
      if (!element) {
        throw new Error(`容器元素未找到: ${options.container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = options.container;
    }

    // 创建视频元素
    this.video = document.createElement("video");
    this.video.controls = options.controls !== false;
    this.video.preload = options.preload || "metadata";

    // 设置 ARIA 标签以提升可访问性
    this.video.setAttribute("role", "application");
    this.video.setAttribute("aria-label", "视频播放器");
    this.video.setAttribute("aria-describedby", "video-player-description");

    // 设置初始属性
    if (options.autoplay) {
      this.video.autoplay = true;
    }
    if (options.loop) {
      this.video.loop = true;
    }
    if (options.muted !== undefined) {
      this.video.muted = options.muted;
    }
    if (options.volume !== undefined) {
      this.video.volume = Math.max(0, Math.min(1, options.volume));
    }
    if (options.playbackRate !== undefined) {
      this.video.playbackRate = Math.max(
        0.25,
        Math.min(4, options.playbackRate),
      );
    }
    if (options.width) {
      this.video.width = typeof options.width === "number"
        ? options.width
        : parseInt(options.width);
    }
    if (options.height) {
      this.video.height = typeof options.height === "number"
        ? options.height
        : parseInt(options.height);
    }

    // 设置样式
    this.video.style.width = "100%";
    this.video.style.height = "100%";
    this.video.style.display = "block";

    // 添加到容器
    this.container.appendChild(this.video);

    // 设置初始视频源
    if (options.src) {
      if (Array.isArray(options.src)) {
        this.playlist = options.src.map((src) => ({ src }));
        this.playlistIndex = 0;
        if (options.src.length > 0) {
          this.loadSource(options.src[0]);
        }
      } else {
        this.loadSource(options.src);
      }
    }

    // 设置播放列表
    if (options.playlist && options.playlist.length > 0) {
      this.playlist = options.playlist;
      this.playlistIndex = 0;
      this.loadPlaylistItem(0);
    }

    // 设置字幕
    if (options.subtitles && options.subtitles.length > 0) {
      this.setSubtitles(options.subtitles);
    }

    // 设置键盘快捷键
    this.keyboardShortcuts = options.keyboardShortcuts !== false;
    if (this.keyboardShortcuts) {
      this.setupKeyboardShortcuts();
    }

    // 启用播放历史功能
    this.enablePlaybackHistory = options.enablePlaybackHistory === true;
    if (this.enablePlaybackHistory) {
      // 开始定期保存播放位置
      this.startPositionSaving();
    }

    // 启用设置保存功能
    this.saveSettings = options.saveSettings === true;
    if (this.saveSettings) {
      // 加载保存的设置（音量、速度、静音状态）
      this.loadSavedSettings();
    }

    // 根据预加载策略启用智能预加载
    if (options.preloadStrategy === "smart" && this.playlist.length > 1) {
      this.schedulePreload();
    }

    // 设置播放列表循环和随机播放
    this.playlistLoop = options.playlistLoop || "none";
    this.playlistShuffle = options.playlistShuffle === true;
    if (this.playlistShuffle && this.playlist.length > 0) {
      this.shufflePlaylist();
    }

    // 设置事件监听
    this.setupEngineEvents();
  }

  /**
   * 加载视频源
   *
   * @param src - 视频源 URL
   * @param options - 配置选项（可选，用于覆盖默认配置）
   */
  loadSource(src: string, options?: Partial<VideoPlayerOptions>): void {
    this.currentSrc = src;
    this.currentFormat = detectVideoFormat(src);

    // 如果启用自动格式选择，尝试选择最佳格式
    let actualSrc = src;
    if (this.options.autoSelectBestFormat) {
      const recommendedFormats = getRecommendedFormats(this.video);
      logger.debug("推荐格式:", recommendedFormats);
      // 如果当前格式不在推荐列表中，尝试使用备用源
      if (
        !recommendedFormats.includes(this.currentFormat) &&
        this.options.fallbackSources &&
        this.options.fallbackSources.length > 0
      ) {
        // 找到第一个推荐格式的备用源
        for (const fallback of this.options.fallbackSources) {
          const fallbackFormat = detectVideoFormat(fallback.src);
          if (recommendedFormats.includes(fallbackFormat)) {
            logger.debug(`自动切换到推荐格式: ${fallbackFormat}`);
            actualSrc = fallback.src;
            this.currentFormat = fallbackFormat;
            break;
          }
        }
      }
    }

    // 如果检测到 RTMP 格式，自动转换为 HTTP-FLV
    if (this.currentFormat === VideoFormat.RTMP) {
      const httpFlvUrl = this.convertRTMPToHTTPFLV(actualSrc);
      if (httpFlvUrl) {
        logger.info(`RTMP URL 已自动转换为 HTTP-FLV: ${httpFlvUrl}`);
        actualSrc = httpFlvUrl;
        // 更新格式为 FLV（因为转换后是 HTTP-FLV）
        this.currentFormat = VideoFormat.FLV;
      } else {
        logger.warn("RTMP URL 无法转换，将尝试使用原始 URL");
      }
    }

    // 合并配置（使用传入的配置或默认配置）
    const defaultConfig: EngineConfigFromOptions = {
      hls: this.options.hls,
      dash: this.options.dash,
      flv: this.options.flv,
      autoDetectFormat: this.options.autoDetectFormat ?? true,
      fallbackToNative: this.options.fallbackToNative ?? true,
    };

    const overrideConfig: Partial<EngineConfigFromOptions> = options ?? {};

    const mergedConfig: PlayerEngineConfig = {
      hls: overrideConfig.hls ?? defaultConfig.hls,
      dash: overrideConfig.dash ?? defaultConfig.dash,
      flv: overrideConfig.flv ?? defaultConfig.flv,
      autoDetectFormat: overrideConfig.autoDetectFormat ??
        defaultConfig.autoDetectFormat,
      fallbackToNative: overrideConfig.fallbackToNative ??
        defaultConfig.fallbackToNative,
    };

    // 创建或更新播放器引擎（使用实际源 URL，可能是转换后的 HTTP-FLV）
    if (!this.engine) {
      this.engine = PlayerEngineFactory.create(
        this.video,
        actualSrc,
        mergedConfig,
      );
    } else {
      // 如果格式改变，需要重新创建引擎
      const newFormat = detectVideoFormat(actualSrc);
      if (newFormat !== this.currentFormat) {
        this.engine.destroy();
        this.engine = PlayerEngineFactory.create(
          this.video,
          actualSrc,
          mergedConfig,
        );
        this.currentFormat = newFormat;
      }
    }

    // 加载视频源（使用实际源 URL，可能是转换后的 HTTP-FLV）
    // 使用错误重试机制
    this.loadWithRetry(actualSrc);
  }

  /**
   * 带重试机制的加载视频源
   *
   * @private
   * @param src - 视频源 URL
   */
  private loadWithRetry(src: string): void {
    try {
      if (!this.engine) {
        throw new Error("播放器引擎未初始化");
      }

      this.engine.load(src);
      this.retryCount = 0; // 重置重试计数

      // 转发引擎事件
      this.setupEngineEvents();
    } catch (error) {
      const errorInfo = this.createDetailedError(error, src);
      this.emit("error", errorInfo);

      // 如果启用多源降级策略，尝试使用备用源
      if (
        this.options.fallbackSources &&
        this.options.fallbackSources.length > 0 &&
        this.retryCount < this.maxRetries
      ) {
        this.retryCount++;
        const fallback = this.options.fallbackSources[this.retryCount - 1];
        if (fallback) {
          logger.debug(
            `尝试备用源 ${this.retryCount}/${this.maxRetries}:`,
            fallback.src,
          );
          // 延迟后重试（指数退避）
          const delay = Math.min(
            1000 * Math.pow(2, this.retryCount - 1),
            10000,
          );
          setTimeout(() => {
            this.loadSource(fallback.src);
          }, delay);
          return;
        }
      }

      // 如果重试次数未达到上限，且没有备用源，则重试当前源
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
        logger.debug(
          `${delay}ms 后重试加载 (${this.retryCount}/${this.maxRetries})`,
        );
        setTimeout(() => {
          this.loadWithRetry(src);
        }, delay);
      } else {
        // 重试次数已达上限
        const finalError = this.createDetailedError(
          new Error("视频加载失败：已达到最大重试次数"),
          src,
        );
        this.emit("error", finalError);
        logger.error("视频加载失败:", finalError);
      }
    }
  }

  /**
   * 创建详细的错误信息
   *
   * @private
   * @param error - 原始错误
   * @param src - 视频源 URL
   * @returns 详细的错误信息对象
   */
  private createDetailedError(error: any, src: string): any {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = this.detectErrorType(errorMessage, src);
    const suggestion = this.getErrorSuggestion(errorType, src);

    return {
      type: errorType,
      message: errorMessage,
      originalError: error,
      src,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      suggestion,
      timestamp: Date.now(),
    };
  }

  /**
   * 检测错误类型
   *
   * @private
   * @param message - 错误消息
   * @param _src - 视频源 URL（未使用，保留用于未来扩展）
   * @returns 错误类型
   */
  private detectErrorType(message: string, _src: string): string {
    if (
      message.includes("网络") || message.includes("network") ||
      message.includes("fetch")
    ) {
      return "NETWORK_ERROR";
    }
    if (
      message.includes("格式") || message.includes("format") ||
      message.includes("codec")
    ) {
      return "FORMAT_ERROR";
    }
    if (message.includes("CORS") || message.includes("跨域")) {
      return "CORS_ERROR";
    }
    if (message.includes("404") || message.includes("not found")) {
      return "NOT_FOUND";
    }
    if (message.includes("403") || message.includes("forbidden")) {
      return "FORBIDDEN";
    }
    return "UNKNOWN_ERROR";
  }

  /**
   * 获取错误建议
   *
   * @private
   * @param errorType - 错误类型
   * @param _src - 视频源 URL（未使用，保留用于未来扩展）
   * @returns 建议信息
   */
  private getErrorSuggestion(errorType: string, _src: string): string {
    switch (errorType) {
      case "NETWORK_ERROR":
        return "请检查网络连接，或稍后重试";
      case "FORMAT_ERROR":
        return "视频格式可能不受支持，请尝试使用备用源";
      case "CORS_ERROR":
        return "视频源服务器不允许跨域访问，请联系服务器管理员";
      case "NOT_FOUND":
        return "视频源不存在，请检查 URL 是否正确";
      case "FORBIDDEN":
        return "无权访问该视频源，请检查权限设置";
      default:
        return "请尝试刷新页面或使用备用视频源";
    }
  }

  /**
   * 设置引擎事件监听
   *
   * @private
   */
  private setupEngineEvents(): void {
    if (!this.engine) {
      return;
    }

    // 如果已经设置过事件，先清理旧的事件监听器
    if (this.engineEventsSetup) {
      this.cleanupEngineEvents();
    }

    const events: PlayerEvent[] = [
      "loadstart",
      "loadedmetadata",
      "loadeddata",
      "progress",
      "canplay",
      "canplaythrough",
      "play",
      "pause",
      "ended",
      "timeupdate",
      "volumechange",
      "ratechange",
      "seeking",
      "seeked",
      "waiting",
      "error",
      "connectionstatuschange",
    ];

    // 普通事件直接转发
    events.forEach((event) => {
      if (this.engine) {
        const handler = (data?: any) => {
          this.handleEngineEvent(event, data);
        };
        this.engine.on(event, handler);
        // 保存处理器引用以便后续清理
        const handlers = this.engineEventHandlers.get(event) || [];
        handlers.push(handler);
        this.engineEventHandlers.set(event, handlers);
      }
    });

    // timeupdate 使用节流优化（每 250ms 最多触发一次）
    if (this.engine) {
      this.throttledTimeUpdate = throttle(() => {
        this.emit("timeupdate");
        this.updatePlaybackStats();
      }, 250);
      this.engine.on("timeupdate", this.throttledTimeUpdate);
      // 保存处理器引用
      const handlers = this.engineEventHandlers.get("timeupdate") || [];
      handlers.push(this.throttledTimeUpdate);
      this.engineEventHandlers.set("timeupdate", handlers);
    }

    // volumechange 使用防抖优化（300ms 内只执行最后一次）
    if (this.engine) {
      this.debouncedVolumeChange = debounce(() => {
        this.emit("volumechange");
      }, 300);
      this.engine.on("volumechange", this.debouncedVolumeChange);
      // 保存处理器引用
      const handlers = this.engineEventHandlers.get("volumechange") || [];
      handlers.push(this.debouncedVolumeChange);
      this.engineEventHandlers.set("volumechange", handlers);
    }

    // seeking 使用节流优化（每 100ms 最多触发一次）
    if (this.engine) {
      this.throttledSeeking = throttle(() => {
        this.emit("seeking");
      }, 100);
      this.engine.on("seeking", this.throttledSeeking);
      // 保存处理器引用
      const handlers = this.engineEventHandlers.get("seeking") || [];
      handlers.push(this.throttledSeeking);
      this.engineEventHandlers.set("seeking", handlers);
    }

    // 监听原生视频事件（用于统计和画中画）
    this.setupNativeVideoEvents();

    this.engineEventsSetup = true;
  }

  /**
   * 清理引擎事件监听器
   *
   * @private
   */
  private cleanupEngineEvents(): void {
    if (!this.engine) {
      return;
    }

    // 移除所有保存的事件处理器
    this.engineEventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.engine?.off(event, handler);
      });
    });
    this.engineEventHandlers.clear();
    this.engineEventsSetup = false;
  }

  /**
   * 处理引擎事件
   *
   * @private
   * @param event - 事件类型
   * @param data - 事件数据
   */
  private handleEngineEvent(event: PlayerEvent, data?: EventData): void {
    switch (event) {
      case "play":
        this.playStartTime = Date.now();
        this.stats.startTime = this.stats.startTime || Date.now();
        break;
      case "pause":
        if (this.playStartTime) {
          this.stats.totalPlayTime += (Date.now() - this.playStartTime) / 1000;
          this.playStartTime = undefined;
        }
        break;
      case "waiting":
        if (!this.bufferingStartTime) {
          this.bufferingStartTime = Date.now();
          this.stats.bufferingCount++;
        }
        break;
      case "canplay":
      case "canplaythrough":
        if (this.bufferingStartTime) {
          this.stats.totalBufferingTime +=
            (Date.now() - this.bufferingStartTime) / 1000;
          this.bufferingStartTime = undefined;
        }
        break;
      case "error":
        this.stats.errorCount++;
        break;
      case "ended":
        // 处理播放结束后的循环逻辑
        this.handlePlaylistEnded();
        break;
      case "loadedmetadata":
        // 视频元数据加载完成后，恢复播放位置
        if (this.enablePlaybackHistory && this.currentSrc) {
          this.restorePlaybackPosition(this.currentSrc);
        }
        break;
    }

    // 记录事件日志
    if (this.options.showDebugPanel || this.options.debug) {
      this.addEventLog(event, data);
    }

    this.emit(event, data);
  }

  /**
   * 添加事件日志
   *
   * @private
   * @param event - 事件类型
   * @param data - 事件数据
   */
  private addEventLog(event: PlayerEvent, data?: EventData): void {
    this.eventLog.push({
      time: Date.now(),
      event,
      data,
    });

    // 限制日志数量
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog.shift();
    }
  }

  /**
   * 处理播放列表播放结束
   *
   * @private
   */
  private handlePlaylistEnded(): void {
    if (this.playlist.length === 0) {
      return;
    }

    if (this.playlistLoop === "one") {
      // 单曲循环：重新播放当前项
      this.loadPlaylistItem(this.playlistIndex);
      this.play();
    } else if (this.playlistLoop === "all") {
      // 列表循环：播放下一首
      this.next();
    }
    // "none" 模式：不处理，自然停止
  }

  /**
   * 设置原生视频事件监听
   *
   * @private
   */
  private setupNativeVideoEvents(): void {
    // 画中画事件
    this.video.addEventListener("enterpictureinpicture", () => {
      this.isPictureInPicture = true;
      this.emit("pictureinpictureenter");
    });

    this.video.addEventListener("leavepictureinpicture", () => {
      this.isPictureInPicture = false;
      this.emit("pictureinpictureleave");
    });

    // 视频缓冲优化：监控缓冲状态，动态调整
    this.video.addEventListener("progress", () => {
      this.optimizeBuffering();
    });
  }

  /**
   * 优化视频缓冲
   *
   * @private
   */
  private optimizeBuffering(): void {
    if (!this.networkInfo) {
      return;
    }

    const bufferedInfo = this.getBufferedInfo();
    const currentTime = this.currentTime;

    // 如果网络较慢，减少缓冲范围
    if (
      this.networkInfo.effectiveType === "slow-2g" ||
      this.networkInfo.effectiveType === "2g" ||
      this.networkInfo.saveData
    ) {
      // 慢速网络：只缓冲当前播放位置附近的内容
      logger.debug("慢速网络，已优化缓冲策略");
    } else {
      // 快速网络：可以预缓冲更多内容
      // 检查是否有足够的缓冲
      const bufferedAhead = bufferedInfo.bufferedRanges
        .filter((range) =>
          range.start <= currentTime && range.end > currentTime
        )
        .map((range) => range.end - currentTime)
        .reduce((sum, val) => sum + val, 0);

      // 如果缓冲不足 10 秒，可以触发更多预加载
      if (bufferedAhead < 10) {
        logger.debug(`缓冲不足，当前缓冲: ${bufferedAhead.toFixed(1)}秒`);
      }
    }
  }

  /**
   * 更新播放统计
   *
   * @private
   */
  private updatePlaybackStats(): void {
    if (this.playStartTime) {
      this.stats.totalPlayTime = (Date.now() - this.playStartTime) / 1000;
    }
    this.stats.lastUpdateTime = Date.now();
  }

  /**
   * 设置键盘快捷键
   *
   * @private
   */
  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      // 如果焦点在输入框等元素上，不处理快捷键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.seek(this.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          this.seek(this.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          this.setVolume(Math.min(1, this.volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          this.setVolume(Math.max(0, this.volume - 0.1));
          break;
        case "KeyM":
          e.preventDefault();
          this.toggleMute();
          break;
        case "KeyF":
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case "BracketLeft": // [
          e.preventDefault();
          this.setPlaybackRate(Math.max(0.25, this.playbackRate - 0.25));
          break;
        case "BracketRight": // ]
          e.preventDefault();
          this.setPlaybackRate(Math.min(4, this.playbackRate + 0.25));
          break;
        case "Digit0": // 0 - 重置播放速度
          e.preventDefault();
          this.setPlaybackRate(1);
          break;
        case "Equal": // = 或 +
          e.preventDefault();
          this.nextPlaybackRate();
          break;
        case "Minus": // -
          e.preventDefault();
          this.previousPlaybackRate();
          break;
        case "KeyS": // S - 切换字幕
          e.preventDefault();
          this.toggleSubtitles();
          break;
        case "KeyQ": // Q - 切换质量
          e.preventDefault();
          this.toggleQuality();
          break;
        case "KeyH": // H - 显示快捷键帮助
          e.preventDefault();
          this.showKeyboardShortcutsHelp();
          break;
      }
    };

    document.addEventListener("keydown", this.keyboardHandler);
  }

  /**
   * 切换字幕显示
   *
   * @private
   */
  private toggleSubtitles(): void {
    const tracks = this.video.querySelectorAll("track");
    if (tracks.length === 0) {
      return;
    }

    const activeTrack = Array.from(tracks).find(
      (track) => track.track?.mode === "showing",
    );
    if (activeTrack) {
      activeTrack.track!.mode = "hidden";
    } else {
      const firstTrack = tracks[0] as HTMLTrackElement;
      if (firstTrack.track) {
        firstTrack.track.mode = "showing";
      }
    }
  }

  /**
   * 切换质量级别（循环切换）
   *
   * @private
   */
  private toggleQuality(): void {
    const qualities = this.getQualityLevels();
    if (qualities.length === 0) {
      return;
    }

    const currentQuality = this.getCurrentQualityLevel();
    const currentIndex = currentQuality !== undefined ? currentQuality : -1;
    let nextQuality = currentIndex + 1;
    if (nextQuality >= qualities.length) {
      nextQuality = -1; // 切换到自动
    }
    this.setQualityLevel(nextQuality);
  }

  /**
   * 设置字幕
   *
   * @param subtitles - 字幕轨道列表
   */
  setSubtitles(subtitles: SubtitleTrack[]): void {
    // 清除现有字幕轨道
    const existingTracks = this.video.querySelectorAll("track");
    existingTracks.forEach((track) => track.remove());

    // 添加新字幕轨道
    subtitles.forEach((subtitle) => {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.src = subtitle.src;
      track.srclang = subtitle.lang;
      if (subtitle.label) {
        track.label = subtitle.label;
      }
      if (subtitle.default) {
        track.default = true;
      }
      this.video.appendChild(track);
    });
  }

  /**
   * 加载播放列表项
   *
   * @param index - 播放列表索引
   * @param options - 配置选项（可选）
   */
  loadPlaylistItem(index: number, options?: Partial<VideoPlayerOptions>): void {
    if (index < 0 || index >= this.playlist.length) {
      return;
    }

    const item = this.playlist[index];
    this.playlistIndex = index;

    // 使用传入的配置或默认配置
    this.loadSource(item.src, options);

    // 设置字幕
    if (item.subtitles && item.subtitles.length > 0) {
      this.setSubtitles(item.subtitles);
    }

    this.emit("playlistitemchange", item);
  }

  /**
   * 播放视频
   *
   * @returns Promise<void>
   */
  async play(): Promise<void> {
    if (!this.engine) {
      throw new Error("播放器引擎未初始化");
    }
    await this.engine.play();
  }

  /**
   * 暂停视频
   */
  pause(): void {
    if (!this.engine) {
      return;
    }
    this.engine.pause();
  }

  /**
   * 切换播放/暂停
   */
  togglePlay(): void {
    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  /**
   * 停止视频（暂停并重置到开始）
   */
  stop(): void {
    this.pause();
    this.seek(0);
  }

  /**
   * 跳转到指定时间
   *
   * @param time - 时间（秒）
   */
  seek(time: number): void {
    if (!this.engine) {
      this.video.currentTime = Math.max(0, Math.min(time, this.duration));
      return;
    }
    this.engine.seek(time);
  }

  /**
   * 设置音量
   *
   * @param volume - 音量 (0-1)
   */
  setVolume(volume: number): void {
    if (!this.engine) {
      this.video.volume = Math.max(0, Math.min(1, volume));
      return;
    }
    this.engine.setVolume(volume);
  }

  /**
   * 切换静音
   */
  toggleMute(): void {
    this.video.muted = !this.video.muted;
  }

  /**
   * 设置播放速度
   *
   * @param rate - 播放速度 (0.25-4)
   */
  setPlaybackRate(rate: number): void {
    if (!this.engine) {
      this.video.playbackRate = Math.max(0.25, Math.min(4, rate));
    } else {
      this.engine.setPlaybackRate(rate);
    }
    // 保存设置
    if (this.saveSettings) {
      this.saveCurrentSettings();
    }
  }

  /**
   * 获取播放速度预设列表
   *
   * @returns 播放速度预设数组
   */
  getPlaybackRatePresets(): number[] {
    return this.options.playbackRatePresets ||
      [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  }

  /**
   * 设置播放速度预设
   *
   * @param presets - 播放速度预设数组
   */
  setPlaybackRatePresets(presets: number[]): void {
    this.options.playbackRatePresets = presets;
  }

  /**
   * 切换到下一个播放速度预设
   */
  nextPlaybackRate(): void {
    const presets = this.getPlaybackRatePresets();
    const currentRate = this.playbackRate;
    const currentIndex = presets.findIndex((p) =>
      Math.abs(p - currentRate) < 0.01
    );
    const nextIndex = currentIndex >= 0 && currentIndex < presets.length - 1
      ? currentIndex + 1
      : 0;
    this.setPlaybackRate(presets[nextIndex]);
  }

  /**
   * 切换到上一个播放速度预设
   */
  previousPlaybackRate(): void {
    const presets = this.getPlaybackRatePresets();
    const currentRate = this.playbackRate;
    const currentIndex = presets.findIndex((p) =>
      Math.abs(p - currentRate) < 0.01
    );
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : presets.length - 1;
    this.setPlaybackRate(presets[prevIndex]);
  }

  /**
   * 进入全屏
   */
  async requestFullscreen(): Promise<void> {
    if (this.video.requestFullscreen) {
      await this.video.requestFullscreen();
    } else if ((this.video as any).webkitRequestFullscreen) {
      await (this.video as any).webkitRequestFullscreen();
    } else if ((this.video as any).mozRequestFullScreen) {
      await (this.video as any).mozRequestFullScreen();
    } else if ((this.video as any).msRequestFullscreen) {
      await (this.video as any).msRequestFullscreen();
    }
  }

  /**
   * 退出全屏
   */
  async exitFullscreen(): Promise<void> {
    const doc = document as FullscreenDocument;
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else {
      throw new Error("浏览器不支持全屏 API");
    }
  }

  /**
   * 切换全屏
   */
  async toggleFullscreen(): Promise<void> {
    if (this.isFullscreen()) {
      await this.exitFullscreen();
    } else {
      await this.requestFullscreen();
    }
  }

  /**
   * 检查是否全屏
   *
   * @returns 是否全屏
   */
  isFullscreen(): boolean {
    const doc = document as FullscreenDocument;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }

  /**
   * 播放下一首
   */
  next(): void {
    if (this.playlist.length > 0) {
      const nextIndex = (this.playlistIndex + 1) % this.playlist.length;
      this.loadPlaylistItem(nextIndex);
      this.play();
    }
  }

  /**
   * 播放上一首
   */
  previous(): void {
    if (this.playlist.length > 0) {
      const prevIndex = (this.playlistIndex - 1 + this.playlist.length) %
        this.playlist.length;
      this.loadPlaylistItem(prevIndex);
      this.play();
    }
  }

  /**
   * 设置播放列表
   *
   * @param playlist - 播放列表
   */
  setPlaylist(playlist: PlaylistItem[]): void {
    this.playlist = playlist;
    this.playlistIndex = playlist.length > 0 ? 0 : -1;
    // 重置随机播放状态
    this.playlistOriginalOrder = [];
    if (this.playlistShuffle && playlist.length > 0) {
      this.shufflePlaylist();
    }
    if (playlist.length > 0) {
      this.loadPlaylistItem(0);
    }
    this.emit("playlistchange", playlist);
  }

  /**
   * 搜索播放列表
   *
   * @param query - 搜索关键词
   * @returns 匹配的播放列表项数组
   *
   * @example
   * ```typescript
   * const results = player.searchPlaylist("video");
   * results.forEach(item => {
   *   console.log(item.title, item.src);
   * });
   * ```
   */
  searchPlaylist(query: string): PlaylistItem[] {
    if (!query || query.trim() === "") {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    return this.playlist.filter((item) => {
      // 搜索标题
      if (item.title && item.title.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // 搜索描述（如果存在）
      if (
        (item as any).description &&
        (item as any).description.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }
      // 搜索源 URL
      if (item.src && item.src.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return false;
    });
  }

  /**
   * 跳转到播放列表中的指定项
   *
   * @param item - 播放列表项或索引
   * @returns 是否跳转成功
   *
   * @example
   * ```typescript
   * // 通过索引跳转
   * player.jumpToPlaylistItem(2);
   *
   * // 通过项跳转
   * const item = player.searchPlaylist("video")[0];
   * player.jumpToPlaylistItem(item);
   * ```
   */
  jumpToPlaylistItem(item: PlaylistItem | number): boolean {
    let index: number;

    if (typeof item === "number") {
      index = item;
    } else {
      index = this.playlist.findIndex((i) => i.src === item.src);
    }

    if (index < 0 || index >= this.playlist.length) {
      return false;
    }

    this.loadPlaylistItem(index);
    this.play();
    return true;
  }

  /**
   * 随机打乱播放列表
   *
   * @private
   */
  private shufflePlaylist(): void {
    if (this.playlist.length === 0) {
      return;
    }

    // 保存原始顺序
    if (this.playlistOriginalOrder.length === 0) {
      this.playlistOriginalOrder = [...this.playlist];
    }

    // Fisher-Yates 洗牌算法
    const shuffled = [...this.playlist];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.playlist = shuffled;
    // 更新当前索引
    const currentItem = this.playlistOriginalOrder[this.playlistIndex];
    this.playlistIndex = this.playlist.findIndex(
      (item) => item.src === currentItem?.src,
    );
    if (this.playlistIndex === -1) {
      this.playlistIndex = 0;
    }
  }

  /**
   * 恢复播放列表原始顺序
   */
  restorePlaylistOrder(): void {
    if (this.playlistOriginalOrder.length > 0) {
      this.playlist = [...this.playlistOriginalOrder];
      this.playlistOriginalOrder = [];
      this.playlistShuffle = false;
      // 更新当前索引
      const currentSrc = this.currentSrc;
      if (currentSrc) {
        this.playlistIndex = this.playlist.findIndex(
          (item) => item.src === currentSrc,
        );
        if (this.playlistIndex === -1) {
          this.playlistIndex = 0;
        }
      }
    }
  }

  /**
   * 设置播放列表循环模式
   *
   * @param mode - 循环模式：'none'（不循环）、'one'（单曲循环）、'all'（列表循环）
   */
  setPlaylistLoop(mode: "none" | "one" | "all"): void {
    this.playlistLoop = mode;
    this.emit("playlistloopchange", { mode });
  }

  /**
   * 切换播放列表随机播放
   *
   * @param enabled - 是否启用随机播放
   */
  setPlaylistShuffle(enabled: boolean): void {
    if (enabled && !this.playlistShuffle) {
      this.shufflePlaylist();
    } else if (!enabled && this.playlistShuffle) {
      this.restorePlaylistOrder();
    }
    this.playlistShuffle = enabled;
    this.emit("playlistshufflechange", { enabled });
  }

  /**
   * 添加播放列表项
   *
   * @param item - 播放列表项
   */
  addPlaylistItem(item: PlaylistItem): void {
    this.playlist.push(item);
    if (this.playlistIndex === -1) {
      this.playlistIndex = 0;
      this.loadPlaylistItem(0);
    }
    this.emit("playlistchange", this.playlist);
  }

  /**
   * 移除播放列表项
   *
   * @param index - 索引
   */
  removePlaylistItem(index: number): void {
    if (index < 0 || index >= this.playlist.length) {
      return;
    }

    this.playlist.splice(index, 1);

    // 调整当前索引
    if (this.playlistIndex >= this.playlist.length) {
      this.playlistIndex = this.playlist.length > 0 ? 0 : -1;
    }

    if (this.playlist.length > 0 && this.playlistIndex >= 0) {
      this.loadPlaylistItem(this.playlistIndex);
    } else {
      this.stop();
    }

    this.emit("playlistchange", this.playlist);
  }

  /**
   * 监听事件
   *
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  on(event: PlayerEvent, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  /**
   * 移除事件监听器
   *
   * @param event - 事件名称
   * @param callback - 要移除的回调函数（可选）
   */
  off(event: PlayerEvent, callback?: EventCallback): void {
    if (!callback) {
      this.eventListeners.delete(event);
    } else {
      const listeners = this.eventListeners.get(event) || [];
      const filtered = listeners.filter((cb) => cb !== callback);
      if (filtered.length === 0) {
        this.eventListeners.delete(event);
      } else {
        this.eventListeners.set(event, filtered);
      }
    }
  }

  /**
   * 触发事件
   *
   * @private
   * @param event - 事件名称
   * @param data - 事件数据
   */
  private emit(event: PlayerEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[VideoPlayerV2] 事件处理器错误 (${event}):`, error);
      }
    });
  }

  /**
   * 获取播放器状态
   *
   * @returns 播放器状态
   */
  getState(): PlayerState {
    const buffered = this.getBufferedProgress();
    return {
      playing: !this.video.paused && !this.video.ended,
      paused: this.video.paused,
      ended: this.video.ended,
      currentTime: this.currentTime,
      duration: this.duration,
      buffered,
      volume: this.volume,
      muted: this.video.muted,
      playbackRate: this.playbackRate,
      fullscreen: this.isFullscreen(),
      src: this.currentSrc || "",
      playlistIndex: this.playlistIndex,
    };
  }

  /**
   * 获取缓冲进度
   *
   * @private
   * @returns 缓冲进度 (0-1)
   */
  private getBufferedProgress(): number {
    if (!this.video.buffered.length || !this.video.duration) {
      return 0;
    }
    const bufferedEnd = this.video.buffered.end(
      this.video.buffered.length - 1,
    );
    return bufferedEnd / this.video.duration;
  }

  /**
   * 获取当前时间
   *
   * @returns 当前时间（秒）
   */
  get currentTime(): number {
    return this.engine?.getCurrentTime() ?? this.video.currentTime;
  }

  /**
   * 获取总时长
   *
   * @returns 总时长（秒）
   */
  get duration(): number {
    return this.engine?.getDuration() ?? (this.video.duration || 0);
  }

  /**
   * 获取音量
   *
   * @returns 音量 (0-1)
   */
  get volume(): number {
    return this.engine?.getVolume() ?? this.video.volume;
  }

  /**
   * 获取播放速度
   *
   * @returns 播放速度
   */
  get playbackRate(): number {
    return this.engine?.getPlaybackRate() ?? this.video.playbackRate;
  }

  /**
   * 获取当前视频格式
   *
   * @returns 视频格式
   */
  getFormat(): VideoFormat {
    return this.currentFormat || VideoFormat.UNKNOWN;
  }

  /**
   * 获取视频信息
   *
   * @returns 视频信息对象
   *
   * @example
   * ```typescript
   * const info = player.getVideoInfo();
   * console.log(`格式: ${info.format}`);
   * console.log(`分辨率: ${info.width}x${info.height}`);
   * console.log(`码率: ${info.bitrate} bps`);
   * ```
   */
  getVideoInfo(): {
    format: VideoFormat;
    width: number;
    height: number;
    duration: number;
    bitrate?: number;
    qualityLevel?: number;
    qualityLevels: QualityLevel[];
    networkInfo?: NetworkInfo;
  } {
    const qualities = this.getQualityLevels();
    const currentQuality = this.getCurrentQualityLevel();
    const currentQualityInfo =
      currentQuality !== undefined && currentQuality >= 0
        ? qualities[currentQuality]
        : undefined;

    return {
      format: this.currentFormat || VideoFormat.UNKNOWN,
      width: this.video.videoWidth || 0,
      height: this.video.videoHeight || 0,
      duration: this.duration,
      bitrate: currentQualityInfo?.bitrate,
      qualityLevel: currentQuality !== undefined && currentQuality >= 0
        ? currentQuality
        : undefined,
      qualityLevels: qualities,
      networkInfo: this.networkInfo,
    };
  }

  /**
   * 获取缓冲进度信息
   *
   * @returns 缓冲进度信息
   */
  getBufferedInfo(): {
    buffered: number;
    bufferedRanges: Array<{ start: number; end: number }>;
    bufferedPercentage: number;
  } {
    const buffered = this.video.buffered;
    const ranges: Array<{ start: number; end: number }> = [];
    let totalBuffered = 0;

    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);
      ranges.push({ start, end });
      totalBuffered += end - start;
    }

    const bufferedPercentage = this.duration > 0
      ? (totalBuffered / this.duration) * 100
      : 0;

    return {
      buffered: totalBuffered,
      bufferedRanges: ranges,
      bufferedPercentage,
    };
  }

  /**
   * 获取播放列表
   *
   * @returns 播放列表
   */
  getPlaylist(): PlaylistItem[] {
    return [...this.playlist];
  }

  /**
   * 获取当前播放列表索引
   *
   * @returns 当前索引
   */
  getPlaylistIndex(): number {
    return this.playlistIndex;
  }

  /**
   * 获取视频元素
   *
   * @returns HTMLVideoElement
   */
  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  /**
   * 获取播放器引擎
   *
   * @returns 播放器引擎实例（可能为 undefined）
   */
  getEngine(): BasePlayerEngine | undefined {
    return this.engine;
  }

  /**
   * 获取连接状态（仅对 FLV/RTMP 流有效）
   *
   * @returns 连接状态，如果不是 FLV 引擎则返回 undefined
   */
  getConnectionStatus():
    | "connected"
    | "disconnected"
    | "connecting"
    | "error"
    | undefined {
    if (
      this.engine &&
      typeof (this.engine as any).getConnectionStatus === "function"
    ) {
      return (this.engine as any).getConnectionStatus();
    }
    return undefined;
  }

  /**
   * 手动触发重连（仅对 FLV/RTMP 流有效）
   */
  reconnect(): void {
    if (this.engine && typeof (this.engine as any).reconnect === "function") {
      (this.engine as any).reconnect();
    }
  }

  /**
   * 获取重连次数（仅对 FLV/RTMP 流有效）
   *
   * @returns 重连次数，如果不是 FLV 引擎则返回 undefined
   */
  getReconnectCount(): number | undefined {
    if (
      this.engine &&
      typeof (this.engine as any).getReconnectCount === "function"
    ) {
      return (this.engine as any).getReconnectCount();
    }
    return undefined;
  }

  /**
   * 进入画中画模式
   *
   * @returns Promise<void>
   * @throws 如果浏览器不支持画中画 API
   *
   * @example
   * ```typescript
   * try {
   *   await player.enterPictureInPicture();
   * } catch (error) {
   *   console.error("画中画不支持:", error);
   * }
   * ```
   */
  async enterPictureInPicture(): Promise<void> {
    if (!this.video.requestPictureInPicture) {
      throw new Error("浏览器不支持画中画 API");
    }
    try {
      await this.video.requestPictureInPicture();
    } catch (error) {
      throw new Error(`进入画中画失败: ${error}`);
    }
  }

  /**
   * 退出画中画模式
   *
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await player.exitPictureInPicture();
   * ```
   */
  async exitPictureInPicture(): Promise<void> {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  }

  /**
   * 检查是否支持画中画
   *
   * @returns 是否支持
   */
  isPictureInPictureSupported(): boolean {
    return !!this.video.requestPictureInPicture;
  }

  /**
   * 检查是否处于画中画模式
   *
   * @returns 是否处于画中画模式
   */
  isInPictureInPicture(): boolean {
    return document.pictureInPictureElement === this.video;
  }

  /**
   * 截取当前视频帧
   *
   * @param format - 图片格式（默认：'image/png'）
   * @param quality - 图片质量（0-1，仅对 JPEG 有效）
   * @returns Base64 编码的图片数据 URL
   *
   * @example
   * ```typescript
   * const imageData = player.captureFrame('image/png');
   * // 或
   * const jpegData = player.captureFrame('image/jpeg', 0.9);
   * ```
   */
  captureFrame(
    format: "image/png" | "image/jpeg" = "image/png",
    quality?: number,
  ): string {
    const canvas = document.createElement("canvas");
    canvas.width = this.video.videoWidth || 640;
    canvas.height = this.video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法创建 Canvas 上下文");
    }
    ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(format, quality);
  }

  /**
   * 下载当前视频
   *
   * @param filename - 下载文件名（可选）
   * @param onProgress - 下载进度回调（可选）
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * try {
   *   await player.downloadVideo("my-video.mp4", (progress) => {
   *     console.log(`下载进度: ${(progress.progress * 100).toFixed(1)}%`);
   *   });
   * } catch (error) {
   *   console.error("下载失败:", error);
   * }
   * ```
   */
  async downloadVideo(
    filename?: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    if (!this.currentSrc) {
      throw new Error("没有可下载的视频源");
    }

    try {
      // 检查是否支持下载
      if (
        this.currentSrc.startsWith("blob:") ||
        this.currentSrc.startsWith("data:")
      ) {
        // 对于 blob 或 data URL，直接下载
        const link = document.createElement("a");
        link.href = this.currentSrc;
        link.download = filename || "video";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 对于远程 URL，需要先获取数据（支持进度）
      const response = await fetch(this.currentSrc);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        throw new Error("响应体不可读");
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      const startTime = Date.now();
      let lastUpdateTime = startTime;

      // 更新网络请求统计
      this.networkRequestStats.totalRequests++;
      this.networkRequestStats.requestTimestamps.push(startTime);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        chunks.push(value);
        loaded += value.length;

        // 计算下载进度
        if (onProgress && total > 0) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastUpdateTime) / 1000; // 秒

          if (timeDiff >= 0.1) { // 每 100ms 更新一次
            const speed = value.length / timeDiff;
            const remaining = total - loaded;
            const remainingTime = speed > 0 ? remaining / speed : 0;

            onProgress({
              loaded,
              total,
              progress: loaded / total,
              speed,
              remainingTime,
            });

            lastUpdateTime = currentTime;
          }
        }
      }

      // 更新网络请求统计
      this.networkRequestStats.successfulRequests++;
      this.networkRequestStats.totalBytesDownloaded += loaded;

      const downloadTime = (Date.now() - startTime) / 1000;
      if (downloadTime > 0) {
        const avgSpeed = loaded / downloadTime;
        this.networkRequestStats.averageSpeed =
          (this.networkRequestStats.averageSpeed *
              (this.networkRequestStats.successfulRequests - 1) +
            avgSpeed) /
          this.networkRequestStats.successfulRequests;
      }

      // 合并所有 chunks
      const blob = new Blob(chunks as BlobPart[]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || this.getVideoInfo().format || "video";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 最终进度回调
      if (onProgress) {
        onProgress({
          loaded,
          total,
          progress: 1,
          speed: 0,
          remainingTime: 0,
        });
      }
    } catch (error) {
      // 更新网络请求统计
      this.networkRequestStats.failedRequests++;
      logger.error("视频下载失败:", error);
      throw error;
    }
  }

  /**
   * 获取播放统计信息
   *
   * @returns 播放统计信息
   *
   * @example
   * ```typescript
   * const stats = player.getPlaybackStats();
   * console.log(`总播放时长: ${stats.totalPlayTime} 秒`);
   * console.log(`缓冲次数: ${stats.bufferingCount}`);
   * ```
   */
  getPlaybackStats(): PlaybackStats {
    // 更新当前播放时长
    this.updatePlaybackStats();
    return { ...this.stats };
  }

  /**
   * 获取性能监控数据
   *
   * @returns 性能监控数据
   */
  getPerformanceData(): PerformanceData {
    return { ...this.performanceData };
  }

  /**
   * 开始性能监控
   *
   * @private
   */
  private startPerformanceMonitoring(): void {
    // FPS 监控
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    this.fpsMonitorTimer = setInterval(() => {
      const now = performance.now();
      frameCount++;

      if (now - lastFpsUpdate >= 1000) {
        this.performanceData.fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
        this.emit("performanceupdate", this.performanceData);
      }
    }, 100) as unknown as number;

    // 性能数据监控
    this.performanceMonitorTimer = setInterval(() => {
      this.updatePerformanceData();
    }, 1000) as unknown as number;
  }

  /**
   * 更新性能数据
   *
   * @private
   */
  private updatePerformanceData(): void {
    // 计算缓冲效率
    const bufferedInfo = this.getBufferedInfo();
    const duration = this.duration;
    if (duration > 0) {
      this.performanceData.bufferingEfficiency =
        bufferedInfo.bufferedPercentage;
    }

    // 更新丢帧数（如果 video 元素支持）
    if (this.video.getVideoPlaybackQuality) {
      const quality = this.video.getVideoPlaybackQuality();
      this.performanceData.droppedFrames = quality.droppedVideoFrames;
    }

    // 更新网络请求数
    this.performanceData.networkRequests =
      this.networkRequestStats.totalRequests;

    this.performanceData.lastUpdateTime = Date.now();
  }

  /**
   * 停止性能监控
   */
  stopPerformanceMonitoring(): void {
    if (this.fpsMonitorTimer) {
      clearInterval(this.fpsMonitorTimer);
      this.fpsMonitorTimer = undefined;
    }
    if (this.performanceMonitorTimer) {
      clearInterval(this.performanceMonitorTimer);
      this.performanceMonitorTimer = undefined;
    }
  }

  /**
   * 重置播放统计
   *
   * @example
   * ```typescript
   * player.resetPlaybackStats();
   * ```
   */
  resetPlaybackStats(): void {
    this.stats = {
      totalPlayTime: 0,
      totalBufferingTime: 0,
      bufferingCount: 0,
      errorCount: 0,
    };
    this.playStartTime = undefined;
    this.bufferingStartTime = undefined;
  }

  /**
   * 获取可用的质量级别（HLS/DASH）
   *
   * @returns 质量级别列表
   *
   * @example
   * ```typescript
   * const qualities = player.getQualityLevels();
   * qualities.forEach((q, index) => {
   *   console.log(`${index}: ${q.label} (${q.bitrate}bps)`);
   * });
   * ```
   */
  getQualityLevels(): QualityLevel[] {
    if (!this.engine) {
      return [];
    }

    // HLS 引擎
    if (this.currentFormat === VideoFormat.HLS) {
      const hls = (this.engine as any).hls;
      if (hls && hls.levels) {
        return hls.levels.map((level: any, index: number) => ({
          index,
          label: `${level.height}p` || `Level ${index}`,
          bitrate: level.bitrate,
          width: level.width,
          height: level.height,
        }));
      }
    }

    // DASH 引擎
    if (this.currentFormat === VideoFormat.DASH) {
      const player = (this.engine as any).player;
      if (player && player.getBitrateInfoListFor) {
        const bitrates = player.getBitrateInfoListFor("video");
        return bitrates.map((bitrate: any, index: number) => ({
          index,
          label: `${bitrate.height}p` || `Level ${index}`,
          bitrate: bitrate.bitrate,
          width: bitrate.width,
          height: bitrate.height,
        }));
      }
    }

    return [];
  }

  /**
   * 获取当前质量级别
   *
   * @returns 当前质量级别索引，如果未设置则返回 undefined
   */
  getCurrentQualityLevel(): number | undefined {
    if (!this.engine) {
      return undefined;
    }

    // HLS 引擎
    if (this.currentFormat === VideoFormat.HLS) {
      const hlsEngine = this.engine as BasePlayerEngine & {
        hls?: { currentLevel?: number };
      };
      if (hlsEngine.hls) {
        const level = hlsEngine.hls.currentLevel;
        return level !== undefined && level >= 0 ? level : undefined;
      }
    }

    // DASH 引擎
    if (this.currentFormat === VideoFormat.DASH) {
      const dashEngine = this.engine as BasePlayerEngine & {
        player?: { getQualityFor?: (type: string) => number | undefined };
      };
      if (dashEngine.player?.getQualityFor) {
        const quality = dashEngine.player.getQualityFor("video");
        return quality !== undefined && quality >= 0 ? quality : undefined;
      }
    }

    return undefined;
  }

  /**
   * 设置播放质量级别（HLS/DASH）
   *
   * @param index - 质量级别索引（-1 表示自动）
   * @returns 是否设置成功
   *
   * @example
   * ```typescript
   * // 设置为 720p
   * player.setQualityLevel(2);
   *
   * // 设置为自动
   * player.setQualityLevel(-1);
   * ```
   */
  setQualityLevel(index: number): boolean {
    if (!this.engine) {
      return false;
    }

    // 保存用户偏好
    if (index >= 0) {
      this.options.preferredQuality = index;
    }

    // HLS 引擎
    if (this.currentFormat === VideoFormat.HLS) {
      const hlsEngine = this.engine as BasePlayerEngine & {
        hls?: { currentLevel?: number };
      };
      if (hlsEngine.hls) {
        hlsEngine.hls.currentLevel = index === -1 ? -1 : index;
        this.emit("qualitychange", { index });
        return true;
      }
    }

    // DASH 引擎
    if (this.currentFormat === VideoFormat.DASH) {
      const dashEngine = this.engine as BasePlayerEngine & {
        player?: {
          setQualityFor?: (type: string, index: number) => void;
          setAutoSwitchQualityFor?: (type: string, enabled: boolean) => void;
        };
      };
      if (dashEngine.player?.setQualityFor) {
        if (index === -1) {
          dashEngine.player.setAutoSwitchQualityFor?.("video", true);
        } else {
          dashEngine.player.setAutoSwitchQualityFor?.("video", false);
          dashEngine.player.setQualityFor("video", index);
        }
        this.emit("qualitychange", { index });
        return true;
      }
    }

    return false;
  }

  /**
   * 获取播放历史
   *
   * @param src - 视频源 URL（可选，不传则返回所有历史）
   * @returns 播放历史记录
   */
  getPlaybackHistory(src?: string): PlaybackHistory[] {
    return StorageManager.getPlaybackHistory(src);
  }

  /**
   * 清除播放历史
   *
   * @param src - 视频源 URL（可选，不传则清除所有历史）
   */
  clearPlaybackHistory(src?: string): void {
    StorageManager.clearPlaybackHistory(src);
  }

  /**
   * 恢复播放位置
   *
   * @private
   * @param src - 视频源 URL
   */
  private restorePlaybackPosition(src: string): void {
    const position = StorageManager.getPlaybackPosition(src);
    if (position !== undefined && position > 5) {
      // 如果播放位置大于 5 秒，则恢复
      setTimeout(() => {
        this.seek(position);
        this.emit("playbackrestored", { position });
      }, 500);
    }
  }

  /**
   * 保存播放位置
   *
   * @private
   */
  private savePlaybackPosition(): void {
    if (!this.currentSrc) {
      return;
    }

    const position = this.currentTime;
    const duration = this.duration;

    // 如果播放位置超过总时长的 90%，不保存（视为已看完）
    if (duration > 0 && position / duration > 0.9) {
      StorageManager.clearPlaybackHistory(this.currentSrc);
      return;
    }

    StorageManager.savePlaybackHistory(this.currentSrc, position, duration);
  }

  /**
   * 开始定期保存播放位置
   *
   * @private
   */
  private startPositionSaving(): void {
    // 清除之前的定时器
    if (this.positionSaveTimer) {
      clearInterval(this.positionSaveTimer);
    }

    // 每 5 秒保存一次播放位置
    this.positionSaveTimer = setInterval(() => {
      this.savePlaybackPosition();
    }, 5000) as unknown as number;
  }

  /**
   * 加载保存的设置
   *
   * @private
   */
  private loadSavedSettings(): void {
    const settings = StorageManager.getPlayerSettings();
    if (settings.volume !== undefined) {
      this.setVolume(settings.volume);
    }
    if (settings.playbackRate !== undefined) {
      this.setPlaybackRate(settings.playbackRate);
    }
    if (settings.muted !== undefined) {
      this.video.muted = settings.muted;
    }
  }

  /**
   * 保存当前设置
   *
   * @private
   */
  private saveCurrentSettings(): void {
    if (!this.saveSettings) {
      return;
    }

    const settings: PlayerSettings = {
      volume: this.volume,
      playbackRate: this.playbackRate,
      muted: this.video.muted,
    };

    StorageManager.savePlayerSettings(settings);
  }

  /**
   * 设置网络状态监控
   *
   * @private
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === "undefined") {
      return;
    }

    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      return;
    }

    this.networkChangeHandler = () => {
      const oldInfo = this.networkInfo;
      this.networkInfo = getNetworkStatus();

      if (this.debug) {
        console.log("[VideoPlayer] 网络状态变化:", this.networkInfo);
      }

      // 如果网络状态变化，调整预加载策略
      if (
        oldInfo?.effectiveType !== this.networkInfo?.effectiveType ||
        oldInfo?.saveData !== this.networkInfo?.saveData
      ) {
        this.adjustPreloadStrategy();
        this.emit("networkchange", this.networkInfo);
      }
    };

    connection.addEventListener("change", this.networkChangeHandler);
    globalThis.addEventListener("online", this.networkChangeHandler);
    globalThis.addEventListener("offline", this.networkChangeHandler);
  }

  /**
   * 根据网络状态调整预加载策略
   *
   * @private
   */
  private adjustPreloadStrategy(): void {
    if (!this.networkInfo) {
      return;
    }

    // 如果网络较慢或启用节省数据模式，减少预加载
    if (
      this.networkInfo.saveData ||
      this.networkInfo.effectiveType === "slow-2g" ||
      this.networkInfo.effectiveType === "2g"
    ) {
      // 清除预加载定时器
      if (this.preloadTimer) {
        clearTimeout(this.preloadTimer);
        this.preloadTimer = undefined;
      }
      if (this.debug) {
        console.log("[VideoPlayer] 网络较慢，已禁用预加载");
      }
    } else if (this.options.preloadStrategy === "smart") {
      // 网络良好时，重新启用预加载
      this.schedulePreload();
    }
  }

  /**
   * 智能预加载下一个视频（根据网络状态调整）
   *
   * @private
   */
  private schedulePreload(): void {
    // 清除之前的预加载定时器
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
    }

    // 检查网络状态，如果网络较慢或启用节省数据模式，不预加载
    if (
      this.networkInfo?.saveData ||
      this.networkInfo?.effectiveType === "slow-2g" ||
      this.networkInfo?.effectiveType === "2g"
    ) {
      if (this.debug) {
        console.log("[VideoPlayer] 网络较慢，跳过预加载");
      }
      return;
    }

    // 根据网络速度调整预加载阈值
    // 网络越快，预加载阈值越低（更早预加载）
    let preloadThreshold = 0.8; // 默认 80%
    if (
      this.networkInfo?.effectiveType === "4g" ||
      this.networkInfo?.effectiveType === "5g"
    ) {
      preloadThreshold = 0.7; // 4G/5G 网络：70% 时预加载
    } else if (this.networkInfo?.effectiveType === "3g") {
      preloadThreshold = 0.85; // 3G 网络：85% 时预加载
    }

    // 如果当前视频播放到阈值时，预加载下一个视频
    const checkPreload = () => {
      if (
        this.duration > 0 && this.currentTime / this.duration > preloadThreshold
      ) {
        const nextIndex = this.playlistIndex + 1;
        if (nextIndex < this.playlist.length) {
          const nextItem = this.playlist[nextIndex];
          this.preloadNextVideo(nextItem.src);
        }
      } else {
        // 继续检查
        this.preloadTimer = setTimeout(checkPreload, 1000) as unknown as number;
      }
    };

    // 延迟 1 秒后开始检查
    this.preloadTimer = setTimeout(checkPreload, 1000) as unknown as number;
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
   * 预加载下一个视频
   *
   * @private
   * @param src - 视频源 URL
   */
  private preloadNextVideo(src: string): void {
    // 创建隐藏的 video 元素预加载
    const preloadVideo = document.createElement("video");
    preloadVideo.preload = "metadata";
    preloadVideo.style.display = "none";
    preloadVideo.src = src;

    // 预加载完成后移除元素（使用 once 选项确保只执行一次）
    const onLoadedMetadata = () => {
      if (preloadVideo.parentNode) {
        preloadVideo.parentNode.removeChild(preloadVideo);
      }
      this.emit("preloadcomplete", { src });
    };

    const onError = () => {
      if (preloadVideo.parentNode) {
        preloadVideo.parentNode.removeChild(preloadVideo);
      }
    };

    preloadVideo.addEventListener("loadedmetadata", onLoadedMetadata, {
      once: true,
    });
    preloadVideo.addEventListener("error", onError, { once: true });

    document.body.appendChild(preloadVideo);
  }

  /**
   * 设置字幕样式
   *
   * @param style - 字幕样式配置
   *
   * @example
   * ```typescript
   * player.setSubtitleStyle({
   *   color: 'white',
   *   fontSize: '20px',
   *   backgroundColor: 'rgba(0,0,0,0.7)',
   * });
   * ```
   */
  setSubtitleStyle(style: SubtitleStyle): void {
    const tracks = this.video.querySelectorAll("track");
    tracks.forEach((track) => {
      const cue = track.track?.activeCues?.[0];
      if (cue) {
        // 创建样式元素
        const styleId = "video-player-subtitle-style";
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
          styleElement = document.createElement("style");
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }

        // 构建 CSS
        const css = `
          video::cue {
            color: ${style.color || "white"} !important;
            background-color: ${
          style.backgroundColor || "transparent"
        } !important;
            font-size: ${style.fontSize || "16px"} !important;
            font-family: ${style.fontFamily || "Arial"} !important;
            font-weight: ${style.fontWeight || "normal"} !important;
            text-align: ${style.textAlign || "center"} !important;
            bottom: ${style.bottom || "10%"} !important;
            text-shadow: ${
          style.textShadow || "2px 2px 4px rgba(0,0,0,0.8)"
        } !important;
          }
        `;
        styleElement.textContent = css;
      }
    });
  }

  /**
   * 销毁播放器
   */
  destroy(): void {
    // 移除键盘事件监听
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler);
      this.keyboardHandler = undefined;
    }

    // 清理网络状态监听器
    if (this.networkChangeHandler) {
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (connection) {
        connection.removeEventListener("change", this.networkChangeHandler);
      }
      globalThis.removeEventListener("online", this.networkChangeHandler);
      globalThis.removeEventListener("offline", this.networkChangeHandler);
      this.networkChangeHandler = undefined;
    }

    // 保存播放位置
    if (this.enablePlaybackHistory) {
      this.savePlaybackPosition();
    }

    // 保存设置
    if (this.saveSettings) {
      this.saveCurrentSettings();
    }

    // 清除定时器
    if (this.positionSaveTimer) {
      clearInterval(this.positionSaveTimer);
    }
    if (this.preloadTimer) {
      clearTimeout(this.preloadTimer);
    }

    // 退出画中画
    if (this.isPictureInPicture && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {
        // 忽略错误
      });
    }

    // 清理节流/防抖函数
    if (this.throttledTimeUpdate) {
      this.throttledTimeUpdate = undefined;
    }
    if (this.debouncedVolumeChange) {
      this.debouncedVolumeChange = undefined;
    }

    // 销毁引擎（确保完全清理资源）
    if (this.engine) {
      // 清理所有事件监听器
      this.cleanupEngineEvents();
      this.engine.destroy();
      this.engine = undefined;
    }

    // 清除事件监听器
    this.eventListeners.clear();

    // 移除视频元素
    if (this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }

    // 停止视频
    this.video.pause();
    this.video.src = "";

    // 停止性能监控
    this.stopPerformanceMonitoring();

    // 隐藏调试面板
    this.hideDebugPanel();
  }

  /**
   * 显示键盘快捷键帮助
   */
  showKeyboardShortcutsHelp(): void {
    const shortcuts = [
      { key: "空格", action: "播放/暂停" },
      { key: "← →", action: "快退/快进 10 秒" },
      { key: "↑ ↓", action: "音量增减" },
      { key: "M", action: "静音/取消静音" },
      { key: "F", action: "全屏/退出全屏" },
      { key: "P", action: "画中画" },
      { key: "[ ]", action: "播放速度增减" },
      { key: "= -", action: "切换到下一个/上一个速度预设" },
      { key: "0", action: "重置播放速度为 1x" },
      { key: "S", action: "截图" },
      { key: "Q", action: "切换质量" },
      { key: "C", action: "切换字幕" },
      { key: "H", action: "显示此帮助" },
    ];

    const helpText = shortcuts
      .map((s) => `${s.key.padEnd(12)} - ${s.action}`)
      .join("\n");

    if (this.options.showDebugPanel) {
      logger.info("键盘快捷键帮助:\n" + helpText);
    } else {
      // 创建帮助面板
      const panel = document.createElement("div");
      panel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: monospace;
        font-size: 14px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      `;
      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <strong>键盘快捷键</strong>
          <button id="close-help" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">×</button>
        </div>
        <pre style="margin: 0; white-space: pre-wrap;">${helpText}</pre>
      `;

      const closeBtn = panel.querySelector("#close-help");
      const closePanel = () => {
        if (panel.parentNode) {
          panel.parentNode.removeChild(panel);
        }
      };
      closeBtn?.addEventListener("click", closePanel);
      panel.addEventListener("click", (e) => {
        if (e.target === panel) {
          closePanel();
        }
      });

      document.body.appendChild(panel);

      // 3 秒后自动关闭
      setTimeout(closePanel, 3000);
    }

    this.emit("shortcutshelp");
  }

  /**
   * 创建调试面板
   *
   * @returns HTMLElement 调试面板元素
   */
  createDebugPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.id = "video-player-debug-panel";
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #0f0;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      min-width: 300px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    const updatePanel = () => {
      const stats = this.getPlaybackStats();
      const perf = this.getPerformanceData();
      const info = this.getVideoInfo();
      const buffered = this.getBufferedInfo();

      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #333;">
          <strong>调试面板</strong>
          <button id="close-debug" style="background: none; border: none; color: #0f0; cursor: pointer;">×</button>
        </div>
        <div style="margin-bottom: 10px;">
          <strong>播放状态</strong><br>
          格式: ${info.format}<br>
          分辨率: ${info.width}x${info.height}<br>
          当前时间: ${this.currentTime.toFixed(2)}s / ${
        this.duration.toFixed(2)
      }s<br>
          播放速度: ${this.playbackRate}x<br>
          音量: ${Math.round(this.volume * 100)}%<br>
          缓冲进度: ${(buffered.bufferedPercentage * 100).toFixed(1)}%
        </div>
        <div style="margin-bottom: 10px;">
          <strong>性能指标</strong><br>
          FPS: ${perf.fps}<br>
          丢帧: ${perf.droppedFrames}<br>
          缓冲效率: ${(perf.bufferingEfficiency * 100).toFixed(1)}%<br>
          网络请求: ${perf.networkRequests}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>统计信息</strong><br>
          总播放时间: ${stats.totalPlayTime.toFixed(1)}s<br>
          总缓冲时间: ${stats.totalBufferingTime.toFixed(1)}s<br>
          缓冲次数: ${stats.bufferingCount}<br>
          错误次数: ${stats.errorCount}
        </div>
        <div>
          <strong>网络状态</strong><br>
          ${
        this.networkInfo
          ? `类型: ${this.networkInfo.effectiveType || "未知"}`
          : "未检测"
      }
        </div>
      `;

      const closeBtn = panel.querySelector("#close-debug");
      closeBtn?.addEventListener("click", () => {
        if (panel.parentNode) {
          panel.parentNode.removeChild(panel);
        }
      });
    };

    // 每秒更新一次
    const updateInterval = setInterval(updatePanel, 1000);
    updatePanel();

    // 清理定时器
    const originalRemove = panel.remove;
    panel.remove = function () {
      clearInterval(updateInterval);
      if (originalRemove) {
        originalRemove.call(this);
      }
    };

    return panel;
  }

  /**
   * 显示调试面板
   */
  showDebugPanel(): void {
    let panel = document.getElementById("video-player-debug-panel");
    if (!panel) {
      panel = this.createDebugPanel();
      document.body.appendChild(panel);
    }
  }

  /**
   * 隐藏调试面板
   */
  hideDebugPanel(): void {
    const panel = document.getElementById("video-player-debug-panel");
    if (panel && panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
  }

  /**
   * 获取事件日志
   *
   * @param limit - 限制返回的日志数量（可选）
   * @returns 事件日志数组
   */
  getEventLog(
    limit?: number,
  ): Array<{ time: number; event: PlayerEvent; data?: any }> {
    if (limit !== undefined) {
      return this.eventLog.slice(-limit);
    }
    return [...this.eventLog];
  }

  /**
   * 清除事件日志
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * 获取网络请求统计
   *
   * @returns 网络请求统计信息
   */
  getNetworkRequestStats(): NetworkRequestStats {
    return { ...this.networkRequestStats };
  }

  /**
   * 重置网络请求统计
   */
  resetNetworkRequestStats(): void {
    this.networkRequestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalBytesDownloaded: 0,
      averageSpeed: 0,
      requestTimestamps: [],
    };
  }

  /**
   * 生成性能报告
   *
   * @returns 性能报告对象
   */
  generatePerformanceReport(): {
    stats: PlaybackStats;
    performance: PerformanceData;
    networkInfo: NetworkInfo | null;
    networkStats: NetworkRequestStats;
    quality: {
      current?: number;
      available: QualityLevel[];
    };
    events: {
      total: number;
      recent: Array<{ time: number; event: PlayerEvent; data?: EventData }>;
    };
  } {
    return {
      stats: this.getPlaybackStats(),
      performance: this.getPerformanceData(),
      networkInfo: this.networkInfo || null,
      networkStats: this.getNetworkRequestStats(),
      quality: {
        current: this.getCurrentQualityLevel(),
        available: this.getQualityLevels(),
      },
      events: {
        total: this.eventLog.length,
        recent: this.getEventLog(20),
      },
    };
  }

  /**
   * 导出性能报告为 JSON
   *
   * @returns JSON 字符串
   */
  exportPerformanceReport(): string {
    return JSON.stringify(this.generatePerformanceReport(), null, 2);
  }
}
