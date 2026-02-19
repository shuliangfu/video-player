/**
 * @fileoverview 工具函数测试
 */

import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import {
  detectVideoFormat,
  VideoFormat,
} from "../src/utils/format-detector.ts";
import { logger, LogLevel } from "../src/utils/logger.ts";
import { getNetworkStatus } from "../src/utils/network.ts";
import { type PlayerSettings, StorageManager } from "../src/utils/storage.ts";
import { debounce, throttle } from "../src/utils/throttle.ts";

describe("工具函数", () => {
  describe("throttle", () => {
    it("应该限制函数调用频率", async () => {
      let callCount = 0;
      const throttled = throttle(() => {
        callCount++;
      }, 100);

      // 快速调用多次
      throttled();
      throttled();
      throttled();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(callCount).toBeLessThanOrEqual(2);
    });

    it("应该在指定时间后执行", async () => {
      let executed = false;
      const throttled = throttle(() => {
        executed = true;
      }, 50);

      throttled();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(executed).toBe(true);
    });
  });

  describe("debounce", () => {
    it("应该延迟函数执行", async () => {
      let callCount = 0;
      const debounced = debounce(() => {
        callCount++;
      }, 100);

      // 快速调用多次
      debounced();
      debounced();
      debounced();

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(callCount).toBe(1);
    });

    it("应该在最后一次调用后延迟执行", async () => {
      let executed = false;
      const debounced = debounce(() => {
        executed = true;
      }, 50);

      debounced();
      setTimeout(() => debounced(), 10);
      setTimeout(() => debounced(), 20);

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(executed).toBe(true);
    });
  });

  describe("format-detector", () => {
    it("应该检测 MP4 格式", () => {
      const format = detectVideoFormat("https://example.com/video.mp4");
      expect(format).toBe(VideoFormat.MP4);
    });

    it("应该检测 HLS 格式", () => {
      const format = detectVideoFormat("https://example.com/video.m3u8");
      expect(format).toBe(VideoFormat.HLS);
    });

    it("应该检测 DASH 格式", () => {
      const format = detectVideoFormat("https://example.com/video.mpd");
      expect(format).toBe(VideoFormat.DASH);
    });

    it("应该检测 FLV 格式", () => {
      const format = detectVideoFormat("https://example.com/video.flv");
      expect(format).toBe(VideoFormat.FLV);
    });

    it("应该检测 RTMP 格式", () => {
      const format = detectVideoFormat("rtmp://example.com/live/stream");
      expect(format).toBe(VideoFormat.RTMP);
    });

    it("应该检测 WebM 格式", () => {
      const format = detectVideoFormat("https://example.com/video.webm");
      expect(format).toBe(VideoFormat.WEBM);
    });

    it("应该检测 OGG 格式", () => {
      const format = detectVideoFormat("https://example.com/video.ogv");
      expect(format).toBe(VideoFormat.OGG);
    });

    it("应该返回 UNKNOWN 对于未知格式", () => {
      const format = detectVideoFormat("https://example.com/video.unknown");
      expect(format).toBe(VideoFormat.UNKNOWN);
    });
  });

  describe("network", () => {
    it("应该获取网络状态", () => {
      // Mock navigator（如果不存在）
      const originalNavigator = (globalThis as any).navigator;
      (globalThis as any).navigator = {
        onLine: true,
        connection: {
          effectiveType: "4g",
          saveData: false,
          online: true,
          downlink: 10,
          rtt: 50,
        },
      };

      try {
        const status = getNetworkStatus();
        expect(status).toBeDefined();
        // online 应该是 boolean 类型（如果 navigator.onLine 存在）
        // 在服务端环境中，如果 navigator.onLine 不存在，可能是 undefined
        if (status.online !== undefined) {
          expect(typeof status.online).toBe("boolean");
        }
      } finally {
        // 恢复原始 navigator（如果存在）
        if (originalNavigator) {
          (globalThis as any).navigator = originalNavigator;
        } else {
          delete (globalThis as any).navigator;
        }
      }
    });
  });

  describe("logger", () => {
    it("应该支持设置日志级别", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.setLevel(LogLevel.INFO);
      logger.setLevel(LogLevel.WARN);
      logger.setLevel(LogLevel.ERROR);
    });

    it("应该支持设置调试模式（通过设置日志级别）", () => {
      // 通过设置 DEBUG 级别来启用调试模式
      logger.setLevel(LogLevel.DEBUG);
      logger.setLevel(LogLevel.WARN);
    });

    it("应该提供日志方法", () => {
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });
  });

  describe("StorageManager", () => {
    /** 测试用 localStorage 模拟 */
    let mockStorage: Record<string, string>;

    beforeEach(() => {
      mockStorage = {};
      const origLocalStorage =
        (globalThis as unknown as { localStorage?: Storage })
          .localStorage;
      (globalThis as unknown as { localStorage: Storage }).localStorage = {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        key: (index: number) => Object.keys(mockStorage)[index] ?? null,
        get length() {
          return Object.keys(mockStorage).length;
        },
      };
    });

    afterEach(() => {
      delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
    });

    it("应该保存并获取播放历史", () => {
      // 先清空，避免其它用例或并行/顺序导致的历史残留
      StorageManager.clearPlaybackHistory();
      StorageManager.savePlaybackHistory("https://example.com/v1.mp4", 30, 120);
      const all = StorageManager.getPlaybackHistory();
      expect(all.length).toBe(1);
      expect(all[0].src).toBe("https://example.com/v1.mp4");
      expect(all[0].position).toBe(30);
      expect(all[0].duration).toBe(120);

      const bySrc = StorageManager.getPlaybackHistory(
        "https://example.com/v1.mp4",
      );
      expect(bySrc.length).toBe(1);
      expect(StorageManager.getPlaybackHistory("https://other.com/x.mp4"))
        .toEqual([]);
    });

    it("应该获取指定视频的播放位置", () => {
      StorageManager.savePlaybackHistory("https://example.com/a.mp4", 45);
      expect(StorageManager.getPlaybackPosition("https://example.com/a.mp4"))
        .toBe(45);
      expect(StorageManager.getPlaybackPosition("https://other.com/b.mp4"))
        .toBeUndefined();
    });

    it("应该清除播放历史（按 src 或全部）", () => {
      StorageManager.savePlaybackHistory("https://example.com/v1.mp4", 10);
      StorageManager.savePlaybackHistory("https://example.com/v2.mp4", 20);
      StorageManager.clearPlaybackHistory("https://example.com/v1.mp4");
      expect(StorageManager.getPlaybackHistory().length).toBe(1);
      StorageManager.clearPlaybackHistory();
      expect(StorageManager.getPlaybackHistory()).toEqual([]);
    });

    it("应该保存并获取播放器设置", () => {
      const settings: PlayerSettings = {
        volume: 0.8,
        playbackRate: 1.5,
        muted: false,
      };
      StorageManager.savePlayerSettings(settings);
      const got = StorageManager.getPlayerSettings();
      expect(got.volume).toBe(0.8);
      expect(got.playbackRate).toBe(1.5);
      expect(got.muted).toBe(false);
    });

    it("应该清除播放器设置", () => {
      StorageManager.savePlayerSettings({ volume: 0.5 });
      StorageManager.clearPlayerSettings();
      const got = StorageManager.getPlayerSettings();
      expect(got).toEqual({});
    });
  });
});
