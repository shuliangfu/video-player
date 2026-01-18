/**
 * @module @dreamer/video-player/engines/base
 *
 * @fileoverview 播放器引擎基类
 *
 * 定义所有播放器引擎的统一接口。
 * 所有播放器引擎（原生、HLS、DASH、FLV）都应该继承此类。
 *
 * 主要功能：
 * - 定义统一的播放器引擎接口
 * - 提供事件系统基础实现
 * - 提供通用的播放控制方法
 *
 * @example
 * ```typescript
 * import { BasePlayerEngine } from "jsr:@dreamer/video-player/engines/base";
 *
 * class CustomEngine extends BasePlayerEngine {
 *   load(src: string): void {
 *     // 实现加载逻辑
 *   }
 *   // ... 实现其他抽象方法
 * }
 * ```
 */

import type { EventCallback, PlayerEvent } from "../types.ts";

/**
 * 播放器引擎抽象基类
 *
 * 所有播放器引擎（原生、HLS、DASH 等）都应该继承此类
 * 提供统一的接口，便于切换不同的播放器实现
 */
export abstract class BasePlayerEngine {
  /** 视频元素 */
  protected video: HTMLVideoElement;
  /** 事件监听器 */
  protected eventListeners: Map<PlayerEvent, EventCallback[]> = new Map();

  /**
   * 创建播放器引擎实例
   *
   * @param video - HTMLVideoElement 实例
   */
  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  /**
   * 加载视频源
   *
   * @param src - 视频源 URL
   */
  abstract load(src: string): void;

  /**
   * 播放视频
   *
   * @returns Promise<void>
   */
  abstract play(): Promise<void>;

  /**
   * 暂停视频
   */
  abstract pause(): void;

  /**
   * 跳转到指定时间
   *
   * @param time - 时间（秒）
   */
  abstract seek(time: number): void;

  /**
   * 设置音量
   *
   * @param volume - 音量 (0-1)
   */
  abstract setVolume(volume: number): void;

  /**
   * 设置播放速度
   *
   * @param rate - 播放速度 (0.25-4)
   */
  abstract setPlaybackRate(rate: number): void;

  /**
   * 销毁播放器引擎
   */
  abstract destroy(): void;

  /**
   * 获取当前时间
   *
   * @returns 当前时间（秒）
   */
  getCurrentTime(): number {
    return this.video.currentTime;
  }

  /**
   * 获取总时长
   *
   * @returns 总时长（秒）
   */
  getDuration(): number {
    return this.video.duration || 0;
  }

  /**
   * 获取音量
   *
   * @returns 音量 (0-1)
   */
  getVolume(): number {
    return this.video.volume;
  }

  /**
   * 获取播放速度
   *
   * @returns 播放速度
   */
  getPlaybackRate(): number {
    return this.video.playbackRate;
  }

  /**
   * 获取缓冲进度
   *
   * @returns 缓冲进度 (0-1)
   */
  getBufferedProgress(): number {
    if (!this.video.buffered.length || !this.video.duration) {
      return 0;
    }
    const bufferedEnd = this.video.buffered.end(
      this.video.buffered.length - 1,
    );
    return bufferedEnd / this.video.duration;
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
   * @param callback - 回调函数（可选）
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
   * @protected
   * @param event - 事件名称
   * @param data - 事件数据
   */
  protected emit(event: PlayerEvent, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[BasePlayerEngine] 事件处理器错误 (${event}):`, error);
      }
    });
  }

  /**
   * 设置视频事件监听
   *
   * @protected
   */
  protected setupVideoEvents(): void {
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
    ];

    events.forEach((event) => {
      this.video.addEventListener(event, () => {
        this.emit(event);
      });
    });
  }
}
