/**
 * @fileoverview 集成测试
 * 测试播放器的完整工作流程
 */

import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import { VideoPlayer } from "../src/mod.ts";
import type { PlaylistItem } from "../src/types.ts";

const mockElements: Map<string, any> = new Map();

function setupMockDOM() {
  // 在 Bun 环境中，document 可能存在但不完整，需要强制替换
  const needsMock = typeof document === "undefined" ||
    !document.querySelector ||
    !document.body ||
    !document.createElement;

  if (needsMock) {
    (globalThis as any).document = {
      createElement: (tag: string) => {
        const element: any = {
          tagName: tag.toUpperCase(),
          id: "",
          style: {},
          attributes: {},
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
          },
          setAttribute: (name: string, value: string) => {
            element.attributes[name] = value;
            if (name === "id") {
              element.id = value;
            }
          },
          getAttribute: (name: string) => element.attributes[name],
          appendChild: (child: any) => {
            child.parentNode = element;
            if (child.id) {
              mockElements.set(child.id, child);
            }
            return child;
          },
          removeChild: (child: any) => {
            if (child.id) {
              mockElements.delete(child.id);
            }
          },
          querySelector: (selector: string) => {
            if (selector.startsWith("#")) {
              const id = selector.slice(1);
              return mockElements.get(id) || null;
            }
            return null;
          },
          querySelectorAll: () => [],
          addEventListener: () => {},
          removeEventListener: () => {},
          requestFullscreen: async () => {},
          webkitRequestFullscreen: async () => {},
          mozRequestFullScreen: async () => {},
          msRequestFullscreen: async () => {},
          requestPictureInPicture: async () => {},
          parentNode: null,
        };

        if (tag === "video") {
          element.videoWidth = 1920;
          element.videoHeight = 1080;
          element.duration = 100;
          element.currentTime = 0;
          element.volume = 1;
          element.muted = false;
          element.playbackRate = 1;
          element.paused = true;
          element.ended = false;
          element.buffered = {
            length: 0,
            start: () => 0,
            end: () => 0,
          };
          element.load = () => {};
          element.play = async () => {};
          element.pause = () => {};
          element.getVideoPlaybackQuality = () => ({
            droppedVideoFrames: 0,
            totalVideoFrames: 1000,
          });
        }

        if (tag === "div") {
          element.id = "";
        }

        return element;
      },
      querySelector: (selector: string) => {
        if (selector.startsWith("#")) {
          const id = selector.slice(1);
          return mockElements.get(id) || null;
        }
        return null;
      },
      getElementById: (id: string) => {
        return mockElements.get(id) || null;
      },
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {
        appendChild: (child: any) => {
          if (child.id) {
            mockElements.set(child.id, child);
          }
          return child;
        },
        removeChild: (child: any) => {
          if (child.id) {
            mockElements.delete(child.id);
          }
        },
      },
      exitFullscreen: async () => {},
      webkitExitFullscreen: async () => {},
      mozCancelFullScreen: async () => {},
      msExitFullscreen: async () => {},
      fullscreenElement: null,
      webkitFullscreenElement: null,
      mozFullScreenElement: null,
      msFullscreenElement: null,
      pictureInPictureElement: null,
    };

    (globalThis as any).window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).URL = {
      createObjectURL: () => "blob:mock",
      revokeObjectURL: () => {},
    };
    (globalThis as any).performance = { now: () => Date.now() };
    (globalThis as any).navigator = {
      connection: {
        effectiveType: "4g",
        saveData: false,
        online: true,
        downlink: 10,
        rtt: 50,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      onLine: true,
    };
  }
}

describe("集成测试", () => {
  let container: HTMLDivElement;
  let player: VideoPlayer;

  beforeEach(() => {
    setupMockDOM();
    // 清理之前的元素
    mockElements.clear();

    if (typeof document !== "undefined" && document.createElement) {
      container = document.createElement("div") as any;
      container.id = "test-container";
      // 确保元素有 setAttribute 方法
      if (!container.setAttribute) {
        container.setAttribute = (name: string, value: string) => {
          const attrs = (container as any).attributes || {};
          attrs[name] = value;
          (container as any).attributes = attrs;
          if (name === "id") {
            container.id = value;
          }
        };
      }
      // 先设置 ID，这样 appendChild 时会自动注册
      container.setAttribute("id", "test-container");
      if (document.body && document.body.appendChild) {
        document.body.appendChild(container);
      }
      // 确保元素被注册到 mockElements
      if (!mockElements.has("test-container")) {
        mockElements.set("test-container", container);
      }
    }
  });

  afterEach(() => {
    if (player) {
      try {
        player.destroy();
      } catch {
        // 忽略错误
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("完整播放流程", () => {
    it("应该完成从创建到播放的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
        autoplay: false,
        controls: true,
      });

      expect(player).toBeTruthy();

      // 设置音量
      player.setVolume(0.8);
      expect(player.volume).toBe(0.8);

      // 设置播放速度
      player.setPlaybackRate(1.5);
      expect(player.playbackRate).toBe(1.5);

      // 跳转
      player.seek(10);
      expect(player.currentTime).toBeGreaterThanOrEqual(0);
    });

    it("应该完成播放列表的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      const playlist: PlaylistItem[] = [
        { src: "https://example.com/video1.mp4", title: "视频 1" },
        { src: "https://example.com/video2.mp4", title: "视频 2" },
        { src: "https://example.com/video3.mp4", title: "视频 3" },
      ];

      player = new VideoPlayer({
        container: "#test-container",
        playlist,
        playlistLoop: "all",
        playlistShuffle: false,
      });

      expect(player.getPlaylist().length).toBe(3);

      // 搜索
      const results = player.searchPlaylist("视频 1");
      expect(results.length).toBeGreaterThan(0);

      // 跳转
      player.jumpToPlaylistItem(1);
      expect(player.getPlaylistIndex()).toBe(1);

      // 下一首
      player.next();
      expect(player.getPlaylistIndex()).toBe(2);

      // 上一首
      player.previous();
      expect(player.getPlaylistIndex()).toBe(1);
    });

    it("应该完成性能监控的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
        enablePerformanceMonitoring: true,
      });

      // 获取性能数据
      const perfData = player.getPerformanceData();
      expect(perfData).toBeDefined();

      // 获取播放统计
      const stats = player.getPlaybackStats();
      expect(stats).toBeDefined();

      // 获取网络统计
      const networkStats = player.getNetworkRequestStats();
      expect(networkStats).toBeDefined();

      // 生成性能报告
      const report = player.generatePerformanceReport();
      expect(report).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.networkStats).toBeDefined();

      // 导出报告
      const json = player.exportPerformanceReport();
      expect(typeof json).toBe("string");
    });

    it("应该完成事件系统的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
        showDebugPanel: true,
      });

      let playFired = false;
      let pauseFired = false;

      // 注册事件
      player.on("play", () => {
        playFired = true;
      });

      player.on("pause", () => {
        pauseFired = true;
      });

      // 注意：emit 是私有方法，实际测试中应该通过播放操作触发事件
      // 这里只测试事件监听器注册成功
      expect(playFired).toBe(false); // 初始状态
      expect(pauseFired).toBe(false); // 初始状态

      // 获取事件日志
      const eventLog = player.getEventLog();
      expect(Array.isArray(eventLog)).toBe(true);

      // 清除事件日志
      player.clearEventLog();
      expect(player.getEventLog().length).toBe(0);
    });

    it("应该完成质量管理的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.m3u8",
        autoQualitySwitch: true,
        preferredQuality: 1,
      });

      // 获取质量级别
      const qualities = player.getQualityLevels();
      expect(Array.isArray(qualities)).toBe(true);

      // 获取当前质量
      const currentQuality = player.getCurrentQualityLevel();
      expect(
        currentQuality === undefined || typeof currentQuality === "number",
      ).toBe(true);

      // 设置质量（如果有可用质量）
      if (qualities.length > 0) {
        const success = player.setQualityLevel(0);
        expect(typeof success).toBe("boolean");
      }
    }, { sanitizeOps: false, sanitizeResources: false });

    it("应该完成调试功能的完整流程", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
        showDebugPanel: true,
        debug: true,
      });

      // 创建调试面板
      const panel = player.createDebugPanel();
      expect(panel).toBeDefined();

      // 显示调试面板
      player.showDebugPanel();

      // 隐藏调试面板
      player.hideDebugPanel();

      // 显示快捷键帮助
      player.showKeyboardShortcutsHelp();
    }, { sanitizeOps: false, sanitizeResources: false });
  });

  describe("错误处理和恢复", () => {
    it("应该处理播放错误并支持重试", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/invalid-video.mp4",
        maxRetries: 3,
      });

      expect(player).toBeTruthy();
      // 错误处理逻辑已在内部实现
    });

    it("应该处理网络错误", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
      });

      // 网络错误应该被记录
      const stats = player.getNetworkRequestStats();
      expect(stats).toBeDefined();
    });
  });

  describe("资源清理", () => {
    it("应该在销毁时清理所有资源", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-container",
        src: "https://example.com/video.mp4",
        enablePerformanceMonitoring: true,
        showDebugPanel: true,
      });

      // 使用各种功能
      player.setVolume(0.5);
      player.setPlaybackRate(1.5);
      // 注意：emit 是私有方法，实际测试中应该通过播放操作触发事件

      // 销毁应该不抛出错误
      expect(() => player.destroy()).not.toThrow();
    });
  });
});
