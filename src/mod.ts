/**
 * @module @dreamer/video-player
 *
 * @fileoverview 视频播放器模块
 *
 * 提供完整的 HTML5 视频播放器功能，支持多种格式和流媒体。
 * 这是视频播放器库的主入口文件，导出所有公共 API。
 *
 * 主要功能：
 * - 视频播放器核心类（VideoPlayer）
 * - 多种播放器引擎（原生、HLS、DASH、FLV）
 * - 格式检测工具
 * - 存储管理工具
 * - 类型定义
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
 * await player.play();
 * ```
 */

// 导出播放器
export { VideoPlayer } from "./player.ts";

// 导出播放器引擎
export { BasePlayerEngine } from "./engines/base.ts";
export { DASHPlayerEngine } from "./engines/dash.ts";
export { PlayerEngineFactory } from "./engines/factory.ts";
export { FLVPlayerEngine } from "./engines/flv.ts";
export { HLSPlayerEngine } from "./engines/hls.ts";
export { NativePlayerEngine } from "./engines/native.ts";

// 导出工具
export {
  detectVideoFormat,
  getRecommendedFormats,
  isAV1Supported,
  isIOSSafari,
  isSafari,
  isSafariAV1Supported,
  VideoFormat,
} from "./utils/format-detector.ts";
export { StorageManager } from "./utils/storage.ts";
export type { PlaybackHistory, PlayerSettings } from "./utils/storage.ts";

// 导出类型
export type {
  BufferingStatus,
  DASHConfig,
  EventCallback,
  FLVConfig,
  HLSConfig,
  NetworkConnectionType,
  NetworkEffectiveType,
  NetworkStatus,
  PlaybackStats,
  PlayerEvent,
  PlayerState,
  PlaylistItem,
  QualityLevel,
  SubtitleStyle,
  SubtitleTrack,
  VideoPlayerOptions,
} from "./types.ts";
