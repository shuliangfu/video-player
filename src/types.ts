/**
 * @module @dreamer/video-player/types
 *
 * @fileoverview 视频播放器类型定义
 *
 * 定义视频播放器库中使用的所有类型和接口。
 * 包括配置选项、事件类型、状态类型等。
 *
 * 主要类型：
 * - 播放器配置选项（VideoPlayerOptions）
 * - 引擎配置（HLSConfig、DASHConfig、FLVConfig）
 * - 事件类型（PlayerEvent、EventCallback）
 * - 状态类型（PlayerState、BufferingStatus）
 * - 其他辅助类型
 *
 * @example
 * ```typescript
 * import type { VideoPlayerOptions, PlayerEvent } from "jsr:@dreamer/video-player/types";
 *
 * const options: VideoPlayerOptions = {
 *   container: "#video-container",
 *   src: "https://example.com/video.mp4"
 * };
 * ```
 */

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
  /** 其他 flv.js 配置选项 */
  [key: string]: any;
}

/**
 * 播放器配置选项
 */
export interface VideoPlayerOptions {
  /** 视频元素或选择器 */
  container: string | HTMLElement;
  /** 初始视频源 */
  src?: string | string[];
  /** 是否自动播放 */
  autoplay?: boolean;
  /** 是否循环播放 */
  loop?: boolean;
  /** 是否静音 */
  muted?: boolean;
  /** 初始音量 (0-1) */
  volume?: number;
  /** 初始播放速度 (0.25-4) */
  playbackRate?: number;
  /** 是否显示控制栏 */
  controls?: boolean;
  /** 是否预加载 */
  preload?: "none" | "metadata" | "auto";
  /** 视频宽度 */
  width?: number | string;
  /** 视频高度 */
  height?: number | string;
  /** 自定义控制栏 */
  customControls?: boolean;
  /** 字幕文件列表 */
  subtitles?: SubtitleTrack[];
  /** 播放列表 */
  playlist?: PlaylistItem[];
  /** 是否启用键盘快捷键 */
  keyboardShortcuts?: boolean;
  /** HLS 配置选项 */
  hls?: HLSConfig;
  /** DASH 配置选项 */
  dash?: DASHConfig;
  /** FLV 配置选项 */
  flv?: FLVConfig;
  /** 是否自动检测格式（默认：true） */
  autoDetectFormat?: boolean;
  /** 不支持时是否降级到原生（默认：true） */
  fallbackToNative?: boolean;
  /** 是否为直播流 */
  live?: boolean;
  /** 低延迟模式 */
  lowLatency?: boolean;
  /** 是否启用播放历史（断点续播） */
  enablePlaybackHistory?: boolean;
  /** 是否保存播放器设置（音量、速度等） */
  saveSettings?: boolean;
  /** 预加载策略 */
  preloadStrategy?: "none" | "metadata" | "auto" | "smart";
  /** 是否自动选择最佳格式（考虑浏览器兼容性） */
  autoSelectBestFormat?: boolean;
  /** 备用视频源列表（用于格式降级） */
  fallbackSources?: Array<{ src: string; format?: string }>;
  /** 是否启用调试模式（输出详细日志） */
  debug?: boolean;
  /** 错误重试次数（默认：3） */
  maxRetries?: number;
  /** 播放列表循环模式 */
  playlistLoop?: "none" | "one" | "all";
  /** 播放列表随机播放 */
  playlistShuffle?: boolean;
  /** 播放速度预设列表 */
  playbackRatePresets?: number[];
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 是否显示调试面板 */
  showDebugPanel?: boolean;
  /** 是否启用质量自动切换 */
  autoQualitySwitch?: boolean;
  /** 用户偏好的质量级别（用于记忆） */
  preferredQuality?: number;
}

/**
 * 字幕轨道
 */
export interface SubtitleTrack {
  /** 语言代码 */
  lang: string;
  /** 字幕文件 URL */
  src: string;
  /** 标签 */
  label?: string;
  /** 是否默认 */
  default?: boolean;
}

/**
 * 播放列表项
 */
export interface PlaylistItem {
  /** 视频源 URL */
  src: string;
  /** 标题 */
  title?: string;
  /** 缩略图 */
  thumbnail?: string;
  /** 时长（秒） */
  duration?: number;
  /** 字幕列表 */
  subtitles?: SubtitleTrack[];
}

/**
 * 播放器事件类型
 */
export type PlayerEvent =
  | "loadstart"
  | "loadedmetadata"
  | "loadeddata"
  | "progress"
  | "canplay"
  | "canplaythrough"
  | "play"
  | "pause"
  | "ended"
  | "timeupdate"
  | "volumechange"
  | "ratechange"
  | "seeking"
  | "seeked"
  | "waiting"
  | "error"
  | "fullscreenchange"
  | "playlistchange"
  | "playlistitemchange"
  | "pictureinpictureenter"
  | "pictureinpictureleave"
  | "qualitychange"
  | "playbackrestored"
  | "preloadcomplete"
  | "networkchange"
  | "connectionstatuschange"
  | "playlistloopchange"
  | "playlistshufflechange"
  | "performanceupdate"
  | "shortcutshelp";

/**
 * 播放器状态
 */
export interface PlayerState {
  /** 是否正在播放 */
  playing: boolean;
  /** 是否暂停 */
  paused: boolean;
  /** 是否已结束 */
  ended: boolean;
  /** 当前时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 缓冲进度 (0-1) */
  buffered: number;
  /** 音量 (0-1) */
  volume: number;
  /** 是否静音 */
  muted: boolean;
  /** 播放速度 */
  playbackRate: number;
  /** 是否全屏 */
  fullscreen: boolean;
  /** 当前视频源 */
  src: string;
  /** 当前播放列表索引 */
  playlistIndex: number;
}

/**
 * 事件回调函数类型
 */
export type EventCallback = (data?: any) => void | Promise<void>;

/**
 * 播放统计信息
 */
export interface PlaybackStats {
  /** 总播放时长（秒） */
  totalPlayTime: number;
  /** 总缓冲时长（秒） */
  totalBufferingTime: number;
  /** 缓冲次数 */
  bufferingCount: number;
  /** 错误次数 */
  errorCount: number;
  /** 播放开始时间 */
  startTime?: number;
  /** 最后更新时间 */
  lastUpdateTime?: number;
}

/**
 * 性能监控数据
 */
export interface PerformanceData {
  /** 当前 FPS */
  fps: number;
  /** 丢帧数 */
  droppedFrames: number;
  /** 缓冲效率（0-1） */
  bufferingEfficiency: number;
  /** 网络请求数 */
  networkRequests: number;
  /** 最后更新时间 */
  lastUpdateTime: number;
}

/**
 * 下载进度信息
 */
export interface DownloadProgress {
  /** 已下载字节数 */
  loaded: number;
  /** 总字节数 */
  total: number;
  /** 下载进度（0-1） */
  progress: number;
  /** 下载速度（字节/秒） */
  speed: number;
  /** 预计剩余时间（秒） */
  remainingTime: number;
}

/**
 * 网络请求统计
 */
export interface NetworkRequestStats {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 总下载字节数 */
  totalBytesDownloaded: number;
  /** 平均下载速度（字节/秒） */
  averageSpeed: number;
  /** 请求时间戳列表 */
  requestTimestamps: number[];
}

/**
 * 全屏 API 类型扩展
 */
export interface FullscreenElement extends Element {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

/**
 * 文档全屏 API 类型扩展
 */
export interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

/**
 * 连接状态
 */
export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";

/**
 * 引擎扩展接口（用于类型安全）
 */
export interface EngineExtensions {
  /** 获取重连次数（FLV 引擎） */
  getReconnectCount?: () => number;
  /** 获取连接状态（FLV 引擎） */
  getConnectionStatus?: () => ConnectionStatus;
  /** 获取当前质量级别（HLS/DASH 引擎） */
  getCurrentQualityLevel?: () => number | undefined;
  /** 获取质量级别（DASH 引擎） */
  getQualityFor?: (type: "video" | "audio") => number | undefined;
}

/**
 * 事件数据通用类型
 */
export type EventData =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | Array<unknown>
  | null
  | undefined;

/**
 * 播放质量级别
 */
export interface QualityLevel {
  /** 质量级别索引 */
  index: number;
  /** 质量名称（如 "720p", "1080p"） */
  label: string;
  /** 码率（bps） */
  bitrate?: number;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
}

/**
 * 字幕样式配置
 */
export interface SubtitleStyle {
  /** 字体颜色 */
  color?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 字体大小 */
  fontSize?: string;
  /** 字体家族 */
  fontFamily?: string;
  /** 字体粗细 */
  fontWeight?: string;
  /** 文本对齐 */
  textAlign?: "left" | "center" | "right";
  /** 文本位置（bottom） */
  bottom?: string;
  /** 文本阴影 */
  textShadow?: string;
}

/**
 * 网络连接类型
 */
export type NetworkConnectionType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "none"
  | "wifi"
  | "wimax"
  | "other"
  | "unknown";

/**
 * 网络有效类型（基于带宽和 RTT 估算）
 */
export type NetworkEffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "5g";

/**
 * 网络状态信息
 */
export interface NetworkStatus {
  /** 是否在线 */
  online: boolean;
  /** 连接类型（wifi, cellular, ethernet 等） */
  type?: NetworkConnectionType;
  /** 网络有效类型（基于带宽和 RTT 估算，WiFi 通常为 4g 或 5g） */
  effectiveType?: NetworkEffectiveType;
  /** 下行速度（Mbps，如果可用） */
  downlink?: number;
  /** RTT（往返时间，ms，如果可用） */
  rtt?: number;
  /** 是否节省数据模式 */
  saveData?: boolean;
}

/**
 * 缓冲状态信息
 */
export interface BufferingStatus {
  /** 是否正在缓冲 */
  buffering: boolean;
  /** 缓冲进度 (0-1) */
  buffered: number;
  /** 可播放时长（秒） */
  playableDuration: number;
  /** 总时长（秒） */
  totalDuration: number;
}
