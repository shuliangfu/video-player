/**
 * @module @dreamer/video-player/engines
 *
 * @fileoverview 播放器引擎模块
 *
 * 统一导出所有播放器引擎。
 * 这是播放器引擎模块的主入口文件。
 *
 * 主要功能：
 * - 导出所有播放器引擎类
 * - 导出引擎工厂
 * - 导出引擎配置类型
 *
 * @example
 * ```typescript
 * import { BasePlayerEngine, PlayerEngineFactory } from "jsr:@dreamer/video-player/engines";
 *
 * const engine = PlayerEngineFactory.create(videoElement, url, config);
 * ```
 */

export { BasePlayerEngine } from "./base.ts";
export { type DASHConfig, DASHPlayerEngine } from "./dash.ts";
export { type PlayerEngineConfig, PlayerEngineFactory } from "./factory.ts";
export { type FLVConfig, FLVPlayerEngine } from "./flv.ts";
export { type HLSConfig, HLSPlayerEngine } from "./hls.ts";
export { NativePlayerEngine } from "./native.ts";
