/**
 * @module @dreamer/video-player/engines/factory
 *
 * @fileoverview 播放器引擎工厂
 *
 * 根据视频格式自动创建合适的播放器引擎。
 * 提供统一的引擎创建接口，自动选择最佳播放器引擎。
 *
 * 主要功能：
 * - 根据格式自动选择引擎
 * - 引擎配置管理
 * - RTMP URL 转换
 *
 * @example
 * ```typescript
 * import { PlayerEngineFactory } from "jsr:@dreamer/video-player/engines/factory";
 *
 * const engine = PlayerEngineFactory.create(
 *   videoElement,
 *   "https://example.com/video.m3u8",
 *   { hls: { lowLatencyMode: true } }
 * );
 *
 * engine.load("https://example.com/video.m3u8");
 * ```
 */

import { detectVideoFormat, VideoFormat } from "../utils/format-detector.ts";
import { BasePlayerEngine } from "./base.ts";
import { type DASHConfig, DASHPlayerEngine } from "./dash.ts";
import { type FLVConfig, FLVPlayerEngine } from "./flv.ts";
import { type HLSConfig, HLSPlayerEngine } from "./hls.ts";
import { NativePlayerEngine } from "./native.ts";

/**
 * 将 RTMP URL 转换为 HTTP-FLV URL
 *
 * @param rtmpUrl - RTMP URL
 * @returns HTTP-FLV URL 或 null
 *
 * @example
 * ```typescript
 * convertRTMPToHTTPFLV("rtmp://example.com/live/stream")
 * // 返回: "http://example.com/live/stream.flv"
 * ```
 */
function convertRTMPToHTTPFLV(rtmpUrl: string): string | null {
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
 * 播放器引擎配置
 */
export interface PlayerEngineConfig {
  /** HLS 配置 */
  hls?: HLSConfig;
  /** DASH 配置 */
  dash?: DASHConfig;
  /** FLV 配置 */
  flv?: FLVConfig;
  /** 是否自动检测格式 */
  autoDetectFormat?: boolean;
  /** 不支持时是否降级到原生 */
  fallbackToNative?: boolean;
}

/**
 * 播放器引擎工厂
 *
 * 根据视频格式自动创建合适的播放器引擎
 */
export class PlayerEngineFactory {
  /**
   * 创建播放器引擎
   *
   * @param video - HTMLVideoElement 实例
   * @param src - 视频源 URL
   * @param config - 引擎配置选项
   * @returns 播放器引擎实例
   */
  static create(
    video: HTMLVideoElement,
    src: string,
    config: PlayerEngineConfig = {},
  ): BasePlayerEngine {
    const {
      autoDetectFormat = true,
      fallbackToNative = true,
      hls = {},
    } = config;

    // 自动检测格式
    const format = autoDetectFormat
      ? detectVideoFormat(src)
      : VideoFormat.UNKNOWN;

    // 根据格式创建引擎
    let engine: BasePlayerEngine;

    switch (format) {
      case VideoFormat.HLS:
        try {
          engine = new HLSPlayerEngine(video, hls);
        } catch (error) {
          if (fallbackToNative) {
            console.warn(
              "[PlayerEngineFactory] HLS 引擎创建失败，降级到原生:",
              error,
            );
            engine = new NativePlayerEngine(video);
          } else {
            throw error;
          }
        }
        break;

      case VideoFormat.DASH:
        try {
          engine = new DASHPlayerEngine(video, config.dash);
        } catch (error) {
          if (fallbackToNative) {
            console.warn(
              "[PlayerEngineFactory] DASH 引擎创建失败，降级到原生:",
              error,
            );
            engine = new NativePlayerEngine(video);
          } else {
            throw error;
          }
        }
        break;

      case VideoFormat.FLV:
        try {
          engine = new FLVPlayerEngine(video, config.flv);
        } catch (error) {
          if (fallbackToNative) {
            console.warn(
              "[PlayerEngineFactory] FLV 引擎创建失败，降级到原生:",
              error,
            );
            engine = new NativePlayerEngine(video);
          } else {
            throw error;
          }
        }
        break;

      case VideoFormat.RTMP: {
        // RTMP 无法在浏览器直接播放，需要转换为 HTTP-FLV
        // 尝试将 RTMP URL 转换为 HTTP-FLV URL
        const httpFlvUrl = convertRTMPToHTTPFLV(src);
        if (httpFlvUrl) {
          try {
            // 使用 FLV 引擎播放 HTTP-FLV
            // 注意：转换后的 URL 会在 load 方法中使用
            engine = new FLVPlayerEngine(video, config.flv);
            // 记录转换信息，供后续使用
            (engine as any)._convertedFromRTMP = true;
            (engine as any)._originalRTMPUrl = src;
            (engine as any)._convertedHttpFlvUrl = httpFlvUrl;
            console.info(
              `[PlayerEngineFactory] RTMP URL 已自动转换为 HTTP-FLV: ${httpFlvUrl}`,
            );
          } catch (error) {
            if (fallbackToNative) {
              console.warn(
                "[PlayerEngineFactory] RTMP 转 HTTP-FLV 失败，降级到原生:",
                error,
              );
              engine = new NativePlayerEngine(video);
            } else {
              throw new Error(
                `RTMP 格式转换失败: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
        } else {
          if (fallbackToNative) {
            console.warn(
              "[PlayerEngineFactory] RTMP URL 无法转换，请使用 HTTP-FLV URL",
            );
            engine = new NativePlayerEngine(video);
          } else {
            throw new Error(
              "RTMP 格式无法在浏览器直接播放，请使用 HTTP-FLV URL",
            );
          }
        }
        break;
      }

      case VideoFormat.AV1:
        // AV1 格式使用原生引擎（浏览器原生支持）
        // 如果浏览器不支持，会降级到其他格式
        engine = new NativePlayerEngine(video);
        break;

      default:
        // 使用原生引擎（MP4, WebM, OGG 等）
        engine = new NativePlayerEngine(video);
        break;
    }

    return engine;
  }

  /**
   * 检测视频格式
   *
   * @param src - 视频源 URL
   * @returns 视频格式
   */
  static detectFormat(src: string): VideoFormat {
    return detectVideoFormat(src);
  }
}
