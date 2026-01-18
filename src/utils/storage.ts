/**
 * @module @dreamer/video-player/utils/storage
 *
 * @fileoverview 本地存储工具
 *
 * 用于播放历史、设置等数据的持久化。
 * 提供统一的本地存储接口，支持播放历史和播放器设置的保存。
 *
 * 主要功能：
 * - 播放历史记录管理
 * - 播放器设置管理
 * - 本地存储的读写操作
 *
 * @example
 * ```typescript
 * import { StorageManager } from "jsr:@dreamer/video-player/utils/storage";
 *
 * const storage = new StorageManager();
 * storage.saveHistory("video.mp4", 120.5);
 * const history = storage.getHistory("video.mp4");
 * ```
 */

/**
 * 播放历史记录
 */
export interface PlaybackHistory {
  /** 视频源 URL */
  src: string;
  /** 播放位置（秒） */
  position: number;
  /** 最后更新时间戳 */
  timestamp: number;
  /** 播放时长（秒） */
  duration?: number;
}

/**
 * 播放器设置
 */
export interface PlayerSettings {
  /** 音量 (0-1) */
  volume?: number;
  /** 播放速度 (0.25-4) */
  playbackRate?: number;
  /** 是否静音 */
  muted?: boolean;
}

/**
 * 本地存储管理器
 */
export class StorageManager {
  private static readonly HISTORY_KEY = "video-player-history";
  private static readonly SETTINGS_KEY = "video-player-settings";
  private static readonly MAX_HISTORY_SIZE = 100; // 最多保存 100 条历史记录

  /**
   * 保存播放历史
   *
   * @param src - 视频源 URL
   * @param position - 播放位置（秒）
   * @param duration - 视频总时长（秒）
   */
  static savePlaybackHistory(
    src: string,
    position: number,
    duration?: number,
  ): void {
    try {
      const history = this.getPlaybackHistory();
      const existingIndex = history.findIndex((item) => item.src === src);

      const record: PlaybackHistory = {
        src,
        position: Math.max(0, position),
        timestamp: Date.now(),
        duration,
      };

      if (existingIndex >= 0) {
        // 更新现有记录
        history[existingIndex] = record;
      } else {
        // 添加新记录
        history.unshift(record);
        // 限制历史记录数量
        if (history.length > this.MAX_HISTORY_SIZE) {
          history.pop();
        }
      }

      // 按时间戳排序（最新的在前）
      history.sort((a, b) => b.timestamp - a.timestamp);

      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn("[StorageManager] 保存播放历史失败:", error);
    }
  }

  /**
   * 获取播放历史
   *
   * @param src - 视频源 URL（可选，不传则返回所有历史）
   * @returns 播放历史记录
   */
  static getPlaybackHistory(src?: string): PlaybackHistory[] {
    try {
      const data = localStorage.getItem(this.HISTORY_KEY);
      if (!data) {
        return [];
      }

      const history: PlaybackHistory[] = JSON.parse(data);
      if (src) {
        return history.filter((item) => item.src === src);
      }
      return history;
    } catch (error) {
      console.warn("[StorageManager] 获取播放历史失败:", error);
      return [];
    }
  }

  /**
   * 获取指定视频的播放位置
   *
   * @param src - 视频源 URL
   * @returns 播放位置（秒），如果没有记录则返回 undefined
   */
  static getPlaybackPosition(src: string): number | undefined {
    const history = this.getPlaybackHistory(src);
    if (history.length > 0) {
      return history[0].position;
    }
    return undefined;
  }

  /**
   * 清除播放历史
   *
   * @param src - 视频源 URL（可选，不传则清除所有历史）
   */
  static clearPlaybackHistory(src?: string): void {
    try {
      if (src) {
        const history = this.getPlaybackHistory();
        const filtered = history.filter((item) => item.src !== src);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(this.HISTORY_KEY);
      }
    } catch (error) {
      console.warn("[StorageManager] 清除播放历史失败:", error);
    }
  }

  /**
   * 保存播放器设置
   *
   * @param settings - 播放器设置
   */
  static savePlayerSettings(settings: PlayerSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("[StorageManager] 保存播放器设置失败:", error);
    }
  }

  /**
   * 获取播放器设置
   *
   * @returns 播放器设置
   */
  static getPlayerSettings(): PlayerSettings {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) {
        return {};
      }
      return JSON.parse(data) as PlayerSettings;
    } catch (error) {
      console.warn("[StorageManager] 获取播放器设置失败:", error);
      return {};
    }
  }

  /**
   * 清除播放器设置
   */
  static clearPlayerSettings(): void {
    try {
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.warn("[StorageManager] 清除播放器设置失败:", error);
    }
  }
}
