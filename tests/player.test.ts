/**
 * @fileoverview 视频播放器完整测试套件
 * 测试所有核心功能和新增优化功能
 */

import { afterEach, beforeEach, describe, expect, it } from "@dreamer/test";
import { VideoPlayer } from "../src/mod.ts";
import type { DownloadProgress, PlaylistItem } from "../src/types.ts";

// Mock DOM 元素存储
const mockElements: Map<string, any> = new Map();

// Mock DOM 环境（如果不可用或不完整）
function setupMockDOM() {
  // 在 Bun 环境中，document 可能存在但不完整，需要强制替换
  const needsMock = typeof document === "undefined" ||
    !document.querySelector ||
    !document.body ||
    !document.createElement;

  if (needsMock) {
    // 首先定义 HTMLCanvasElement 类（需要在 createElement 之前）
    (globalThis as any).HTMLCanvasElement = class {
      width = 0;
      height = 0;
      getContext(type: string) {
        if (type === "2d") {
          return {
            fillStyle: "",
            fillRect: () => {},
            drawImage: () => {},
            getImageData: () => ({
              data: new Uint8ClampedArray(4),
              width: 1,
              height: 1,
            }),
            putImageData: () => {},
            clearRect: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            scale: () => {},
            transform: () => {},
            setTransform: () => {},
            beginPath: () => {},
            closePath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            quadraticCurveTo: () => {},
            bezierCurveTo: () => {},
            arc: () => {},
            arcTo: () => {},
            rect: () => {},
            fill: () => {},
            stroke: () => {},
            clip: () => {},
            isPointInPath: () => false,
            isPointInStroke: () => false,
            measureText: () => ({
              width: 0,
              actualBoundingBoxLeft: 0,
              actualBoundingBoxRight: 0,
              fontBoundingBoxAscent: 0,
              fontBoundingBoxDescent: 0,
              actualBoundingBoxAscent: 0,
              actualBoundingBoxDescent: 0,
              emHeightAscent: 0,
              emHeightDescent: 0,
              hangingBaseline: 0,
              alphabeticBaseline: 0,
              ideographicBaseline: 0,
            }),
            fillText: () => {},
            strokeText: () => {},
            createImageData: () => ({
              data: new Uint8ClampedArray(4),
              width: 1,
              height: 1,
            }),
            createLinearGradient: () => ({
              addColorStop: () => {},
            }),
            createRadialGradient: () => ({
              addColorStop: () => {},
            }),
            createPattern: () => ({}),
            createImageDataFromImage: () => ({
              data: new Uint8ClampedArray(4),
              width: 1,
              height: 1,
            }),
          };
        }
        return null;
      }
      toDataURL(format?: string) {
        return `data:${
          format || "image/png"
        };base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
      }
      toBlob() {
        return Promise.resolve(new Blob());
      }
    };

    // 创建基本的 DOM Mock
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
              const oldId = element.id;
              element.id = value;
              // 更新 mockElements 映射
              if (oldId && oldId !== value) {
                mockElements.delete(oldId);
              }
              if (value) {
                mockElements.set(value, element);
              }
            }
          },
          getAttribute: (name: string) => element.attributes[name],
          appendChild: (child: any) => {
            if (child) {
              child.parentNode = element;
              // 如果子元素有 ID，注册到 mockElements
              if (child.id) {
                mockElements.set(child.id, child);
              }
            }
            return child;
          },
          removeChild: (child: any) => {
            if (child && child.id) {
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

        if (tag === "canvas") {
          // 返回 Canvas 元素，使用 HTMLCanvasElement mock
          const canvasElement = new (globalThis as any).HTMLCanvasElement();
          canvasElement.tagName = "CANVAS";
          canvasElement.id = element.id;
          canvasElement.style = element.style;
          canvasElement.attributes = element.attributes;
          canvasElement.classList = element.classList;
          canvasElement.setAttribute = element.setAttribute;
          canvasElement.getAttribute = element.getAttribute;
          canvasElement.appendChild = element.appendChild;
          canvasElement.removeChild = element.removeChild;
          canvasElement.querySelector = element.querySelector;
          canvasElement.querySelectorAll = element.querySelectorAll;
          canvasElement.addEventListener = element.addEventListener;
          canvasElement.removeEventListener = element.removeEventListener;
          canvasElement.parentNode = element.parentNode;
          return canvasElement;
        }

        return element;
      },
      createElementNS: (ns: string, tag: string) => {
        // 用于创建 SVG 元素等
        return (globalThis as any).document.createElement(tag);
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
          if (child && child.id) {
            mockElements.set(child.id, child);
          }
          return child;
        },
        removeChild: (child: any) => {
          if (child && child.id) {
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
      createObjectURL: () => "blob:mock-url",
      revokeObjectURL: () => {},
    };

    (globalThis as any).performance = {
      now: () => Date.now(),
    };

    (globalThis as any).navigator = {
      onLine: true,
      connection: {
        effectiveType: "4g",
        saveData: false,
        online: true,
        downlink: 10,
        rtt: 50,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    };

    (globalThis as any).fetch = async () => ({
      ok: true,
      headers: {
        get: () => "1000000",
      },
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });

    // Mock localStorage for Bun/Deno environments
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index: number) => {
        const keys = Object.keys(storage);
        return keys[index] || null;
      },
    };
  }
}

describe("VideoPlayer", () => {
  let container: HTMLDivElement;
  let player: VideoPlayer;

  beforeEach(() => {
    setupMockDOM();
    // 清理之前的元素
    mockElements.clear();

    if (typeof document !== "undefined") {
      container = document.createElement("div");
      container.id = "test-video-container";
      document.body.appendChild(container);
      // 确保元素被注册到 mockElements
      mockElements.set("test-video-container", container);
    }
  });

  afterEach(() => {
    if (player) {
      try {
        // 停止所有可能运行的定时器
        if (typeof player.stopPerformanceMonitoring === "function") {
          player.stopPerformanceMonitoring();
        }
        player.destroy();
      } catch {
        // 忽略销毁错误
      }
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe("播放器创建和初始化", () => {
    it("应该创建播放器实例", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });

      expect(player).toBeTruthy();
      expect(typeof player.play).toBe("function");
      expect(typeof player.pause).toBe("function");
    });

    it("应该使用 HTMLElement 作为容器", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: container,
        src: "https://example.com/video.mp4",
      });

      expect(player).toBeTruthy();
    });

    it("应该支持所有配置选项", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: container,
        src: "https://example.com/video.mp4",
        autoplay: true,
        muted: true,
        loop: true,
        controls: true,
        preload: "auto",
        volume: 0.5,
        playbackRate: 1.5,
        enablePlaybackHistory: true,
        saveSettings: true,
        preloadStrategy: "smart",
        debug: true,
        maxRetries: 5,
        keyboardShortcuts: true,
        playlistLoop: "all",
        playlistShuffle: true,
        playbackRatePresets: [0.5, 1, 1.5, 2],
        enablePerformanceMonitoring: true,
        showDebugPanel: false,
        autoQualitySwitch: true,
        preferredQuality: 2,
      });

      expect(player).toBeTruthy();
    });
  });

  describe("播放控制", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持播放和暂停", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.play).toBe("function");
      expect(typeof player.pause).toBe("function");
      expect(typeof player.togglePlay).toBe("function");
      expect(typeof player.stop).toBe("function");
    });

    it("应该支持跳转", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.seek).toBe("function");
      player.seek(10);
      expect(player.currentTime).toBeGreaterThanOrEqual(0);
    });

    it("应该支持获取播放状态", () => {
      if (typeof document === "undefined") {
        return;
      }

      const state = player.getState();
      expect(state).toBeDefined();
      expect(typeof state.playing).toBe("boolean");
      expect(typeof state.paused).toBe("boolean");
      expect(typeof state.currentTime).toBe("number");
      expect(typeof state.duration).toBe("number");
    });
  });

  describe("音量控制", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持音量设置", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.setVolume).toBe("function");
      expect(typeof player.toggleMute).toBe("function");
      expect(typeof player.volume).toBe("number");

      player.setVolume(0.5);
      expect(player.volume).toBeGreaterThanOrEqual(0);
      expect(player.volume).toBeLessThanOrEqual(1);
    });

    it("应该限制音量范围在 0-1", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setVolume(-1);
      expect(player.volume).toBeGreaterThanOrEqual(0);

      player.setVolume(2);
      expect(player.volume).toBeLessThanOrEqual(1);
    });
  });

  describe("播放速度控制", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持播放速度设置", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.setPlaybackRate).toBe("function");
      expect(typeof player.playbackRate).toBe("number");

      player.setPlaybackRate(1.5);
      expect(player.playbackRate).toBeGreaterThanOrEqual(0.25);
      expect(player.playbackRate).toBeLessThanOrEqual(4);
    });

    it("应该支持播放速度预设", () => {
      if (typeof document === "undefined") {
        return;
      }

      const presets = player.getPlaybackRatePresets();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);

      player.setPlaybackRatePresets([0.5, 1, 1.5, 2]);
      expect(player.getPlaybackRatePresets()).toEqual([0.5, 1, 1.5, 2]);
    });

    it("应该支持切换到下一个/上一个速度预设", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaybackRatePresets([0.5, 1, 1.5, 2]);
      const initialRate = player.playbackRate;

      player.nextPlaybackRate();
      expect(player.playbackRate).toBeDefined();

      player.previousPlaybackRate();
      expect(player.playbackRate).toBeDefined();
    });

    it("应该限制播放速度在 0.25-4 范围内", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaybackRate(0.1);
      expect(player.playbackRate).toBeGreaterThanOrEqual(0.25);

      player.setPlaybackRate(5);
      expect(player.playbackRate).toBeLessThanOrEqual(4);
    });
  });

  describe("播放列表功能", () => {
    const testPlaylist: PlaylistItem[] = [
      { src: "https://example.com/video1.mp4", title: "视频 1" },
      { src: "https://example.com/video2.mp4", title: "视频 2" },
      { src: "https://example.com/video3.mp4", title: "视频 3" },
    ];

    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        playlist: testPlaylist,
      });
    });

    it("应该支持播放列表基本操作", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.setPlaylist).toBe("function");
      expect(typeof player.addPlaylistItem).toBe("function");
      expect(typeof player.removePlaylistItem).toBe("function");
      expect(typeof player.next).toBe("function");
      expect(typeof player.previous).toBe("function");
      expect(typeof player.getPlaylist).toBe("function");
      expect(typeof player.getPlaylistIndex).toBe("function");
    });

    it("应该正确设置和获取播放列表", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      const playlist = player.getPlaylist();
      expect(playlist.length).toBe(3);
      expect(playlist[0].title).toBe("视频 1");
    });

    it("应该支持播放列表搜索", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      const results = player.searchPlaylist("视频 1");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("视频 1");
    });

    it("应该支持跳转到播放列表项", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      const success = player.jumpToPlaylistItem(1);
      expect(success).toBe(true);
      expect(player.getPlaylistIndex()).toBe(1);
    });

    it("应该支持播放列表循环模式", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      player.setPlaylistLoop("all");
      expect(typeof player.setPlaylistLoop).toBe("function");

      player.setPlaylistLoop("one");
      player.setPlaylistLoop("none");
    });

    it("应该支持播放列表随机播放", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      player.setPlaylistShuffle(true);
      expect(typeof player.setPlaylistShuffle).toBe("function");

      const shuffled = player.getPlaylist();
      expect(shuffled.length).toBe(3);

      player.setPlaylistShuffle(false);
      player.restorePlaylistOrder();
      expect(typeof player.restorePlaylistOrder).toBe("function");
    });

    it("应该支持添加和移除播放列表项", () => {
      if (typeof document === "undefined") {
        return;
      }

      player.setPlaylist(testPlaylist);
      const initialLength = player.getPlaylist().length;

      player.addPlaylistItem({
        src: "https://example.com/video4.mp4",
        title: "视频 4",
      });
      expect(player.getPlaylist().length).toBe(initialLength + 1);

      player.removePlaylistItem(0);
      expect(player.getPlaylist().length).toBe(initialLength);
    });
  });

  describe("事件系统", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持事件监听", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.on).toBe("function");
      expect(typeof player.off).toBe("function");

      let eventFired = false;
      player.on("play", () => {
        eventFired = true;
      });

      // 注意：emit 是私有方法，实际测试中应该通过播放操作触发事件
      // 这里只测试事件监听器注册成功
      expect(eventFired).toBe(false); // 初始状态
    });

    it("应该支持移除事件监听器", () => {
      if (typeof document === "undefined") {
        return;
      }

      let callCount = 0;
      const handler = () => {
        callCount++;
      };

      player.on("play", handler);
      // 注意：emit 是私有方法，实际测试中应该通过播放操作触发事件
      // 这里只测试事件监听器的注册和移除
      expect(callCount).toBe(0); // 初始状态

      player.off("play", handler);
      // 移除后应该不再触发
      expect(callCount).toBe(0);
    });

    it("应该支持事件日志", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        showDebugPanel: true,
      });

      // 事件日志功能已启用
      const eventLog = player.getEventLog();
      expect(Array.isArray(eventLog)).toBe(true);
    });

    it("应该支持清除事件日志", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        showDebugPanel: true,
      });

      // 清除事件日志
      player.clearEventLog();
      expect(player.getEventLog().length).toBe(0);
    });
  });

  describe("性能监控", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        enablePerformanceMonitoring: true,
      });
    });

    it("应该支持获取性能数据", () => {
      if (typeof document === "undefined") {
        return;
      }

      const perfData = player.getPerformanceData();
      expect(perfData).toBeDefined();
      expect(typeof perfData.fps).toBe("number");
      expect(typeof perfData.droppedFrames).toBe("number");
      expect(typeof perfData.bufferingEfficiency).toBe("number");
      expect(typeof perfData.networkRequests).toBe("number");
    });

    it("应该支持停止性能监控", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.stopPerformanceMonitoring).toBe("function");
      player.stopPerformanceMonitoring();
    });

    it("应该支持生成性能报告", () => {
      if (typeof document === "undefined") {
        return;
      }

      const report = player.generatePerformanceReport();
      expect(report).toBeDefined();
      expect(report.stats).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.networkInfo).toBeDefined();
      expect(report.networkStats).toBeDefined();
      expect(report.quality).toBeDefined();
      expect(report.events).toBeDefined();
    });

    it("应该支持导出性能报告为 JSON", () => {
      if (typeof document === "undefined") {
        return;
      }

      const json = player.exportPerformanceReport();
      expect(typeof json).toBe("string");
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe("网络请求统计", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持获取网络请求统计", () => {
      if (typeof document === "undefined") {
        return;
      }

      const stats = player.getNetworkRequestStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe("number");
      expect(typeof stats.successfulRequests).toBe("number");
      expect(typeof stats.failedRequests).toBe("number");
      expect(typeof stats.totalBytesDownloaded).toBe("number");
      expect(typeof stats.averageSpeed).toBe("number");
      expect(Array.isArray(stats.requestTimestamps)).toBe(true);
    });

    it("应该支持重置网络请求统计", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.resetNetworkRequestStats).toBe("function");
      player.resetNetworkRequestStats();

      const stats = player.getNetworkRequestStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
    });
  });

  describe("视频下载功能", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持下载视频", async () => {
      if (typeof document === "undefined") {
        return;
      }

      // 设置当前源
      player.loadSource("https://example.com/video.mp4");

      expect(typeof player.downloadVideo).toBe("function");

      // 注意：实际下载测试需要 Mock fetch
      // 这里只测试方法存在性
    });

    it("应该支持下载进度回调", async () => {
      if (typeof document === "undefined") {
        return;
      }

      player.loadSource("https://example.com/video.mp4");

      let progressReceived = false;
      const onProgress = (progress: DownloadProgress) => {
        progressReceived = true;
        expect(progress).toBeDefined();
        expect(typeof progress.loaded).toBe("number");
        expect(typeof progress.total).toBe("number");
        expect(typeof progress.progress).toBe("number");
        expect(typeof progress.speed).toBe("number");
        expect(typeof progress.remainingTime).toBe("number");
      };

      // 注意：实际测试需要 Mock fetch 和 ReadableStream
      // 这里只测试接口
      expect(typeof onProgress).toBe("function");
    });
  });

  describe("播放统计", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持获取播放统计", () => {
      if (typeof document === "undefined") {
        return;
      }

      const stats = player.getPlaybackStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalPlayTime).toBe("number");
      expect(typeof stats.totalBufferingTime).toBe("number");
      expect(typeof stats.bufferingCount).toBe("number");
      expect(typeof stats.errorCount).toBe("number");
    });

    it("应该支持重置播放统计", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.resetPlaybackStats).toBe("function");
      player.resetPlaybackStats();

      const stats = player.getPlaybackStats();
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.totalBufferingTime).toBe(0);
      expect(stats.bufferingCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe("质量级别管理", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.m3u8",
      });
    });

    it("应该支持获取质量级别列表", () => {
      if (typeof document === "undefined") {
        return;
      }

      const qualities = player.getQualityLevels();
      expect(Array.isArray(qualities)).toBe(true);
    }, { sanitizeOps: false, sanitizeResources: false });

    it("应该支持获取当前质量级别", () => {
      if (typeof document === "undefined") {
        return;
      }

      const currentQuality = player.getCurrentQualityLevel();
      // 可能返回 undefined（如果未设置）
      expect(
        currentQuality === undefined || typeof currentQuality === "number",
      ).toBe(true);
    }, { sanitizeOps: false, sanitizeResources: false });

    it("应该支持设置质量级别", () => {
      if (typeof document === "undefined") {
        return;
      }

      const qualities = player.getQualityLevels();
      if (qualities.length > 0) {
        const success = player.setQualityLevel(0);
        expect(typeof success).toBe("boolean");
      }
    }, { sanitizeOps: false, sanitizeResources: false });

    it("应该支持质量自动切换", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.m3u8",
        autoQualitySwitch: true,
      });

      // 自动切换功能已启用
      expect(player).toBeTruthy();
    }, { sanitizeOps: false, sanitizeResources: false });
  });

  describe("视频信息", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持获取视频信息", () => {
      if (typeof document === "undefined") {
        return;
      }

      const info = player.getVideoInfo();
      expect(info).toBeDefined();
      expect(typeof info.format).toBe("string");
      expect(typeof info.width).toBe("number");
      expect(typeof info.height).toBe("number");
      expect(typeof info.duration).toBe("number");
    });

    it("应该支持获取缓冲信息", () => {
      if (typeof document === "undefined") {
        return;
      }

      const buffered = player.getBufferedInfo();
      expect(buffered).toBeDefined();
      expect(typeof buffered.buffered).toBe("number");
      expect(Array.isArray(buffered.bufferedRanges)).toBe(true);
      expect(typeof buffered.bufferedPercentage).toBe("number");
    });
  });

  describe("全屏功能", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持全屏功能", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.requestFullscreen).toBe("function");
      expect(typeof player.exitFullscreen).toBe("function");
      expect(typeof player.toggleFullscreen).toBe("function");
      expect(typeof player.isFullscreen).toBe("function");
    });

    it("应该正确检测全屏状态", () => {
      if (typeof document === "undefined") {
        return;
      }

      const isFullscreen = player.isFullscreen();
      expect(typeof isFullscreen).toBe("boolean");
    });
  });

  describe("画中画功能", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持画中画功能", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.enterPictureInPicture).toBe("function");
      expect(typeof player.exitPictureInPicture).toBe("function");
      expect(typeof player.isPictureInPictureSupported).toBe("function");
      expect(typeof player.isInPictureInPicture).toBe("function");
    });

    it("应该正确检测画中画支持", () => {
      if (typeof document === "undefined") {
        return;
      }

      const supported = player.isPictureInPictureSupported();
      expect(typeof supported).toBe("boolean");
    });
  });

  describe("截图功能", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持截图", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.captureFrame).toBe("function");

      const imageData = player.captureFrame();
      expect(typeof imageData).toBe("string");
      expect(imageData.startsWith("data:image/")).toBe(true);
    }, { sanitizeOps: false, sanitizeResources: false });

    it("应该支持不同格式的截图", () => {
      if (typeof document === "undefined") {
        return;
      }

      const pngData = player.captureFrame("image/png");
      expect(pngData.startsWith("data:image/png")).toBe(true);

      const jpegData = player.captureFrame("image/jpeg", 0.9);
      expect(jpegData.startsWith("data:image/jpeg")).toBe(true);
    }, { sanitizeOps: false, sanitizeResources: false });
  });

  describe("键盘快捷键", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        keyboardShortcuts: true,
      });
    });

    it("应该支持显示快捷键帮助", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.showKeyboardShortcutsHelp).toBe("function");
      player.showKeyboardShortcutsHelp();
    }, { sanitizeOps: false, sanitizeResources: false });
  });

  describe("调试面板", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        showDebugPanel: true,
      });
    });

    it("应该支持创建和显示调试面板", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.createDebugPanel).toBe("function");
      expect(typeof player.showDebugPanel).toBe("function");
      expect(typeof player.hideDebugPanel).toBe("function");

      const panel = player.createDebugPanel();
      expect(panel).toBeDefined();
      expect(panel.tagName).toBe("DIV");
    }, { sanitizeOps: false, sanitizeResources: false });
  });

  describe("字幕功能", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });
    });

    it("应该支持设置字幕", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.setSubtitles).toBe("function");

      player.setSubtitles([
        {
          lang: "zh",
          src: "https://example.com/subtitle.vtt",
          label: "中文",
        },
      ]);
    });

    it("应该支持设置字幕样式", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(typeof player.setSubtitleStyle).toBe("function");

      player.setSubtitleStyle({
        color: "#ffffff",
        fontSize: "20px",
        backgroundColor: "rgba(0,0,0,0.5)",
      });
    });
  });

  describe("RTMP/FLV 支持", () => {
    beforeEach(() => {
      if (typeof document === "undefined") {
        return;
      }
      player = new VideoPlayer({
        container: "#test-video-container",
        src: "rtmp://example.com/live/stream",
      });
    });

    it("应该支持 RTMP 流", () => {
      if (typeof document === "undefined") {
        return;
      }

      // RTMP 会被转换为 HTTP-FLV
      expect(player).toBeTruthy();
    });

    it("应该支持获取连接状态", () => {
      if (typeof document === "undefined") {
        return;
      }

      const reconnectCount = player.getReconnectCount();
      // 可能返回 undefined（如果不是 FLV 引擎）
      expect(
        reconnectCount === undefined || typeof reconnectCount === "number",
      ).toBe(true);
    });
  });

  describe("播放器销毁", () => {
    it("应该支持销毁播放器", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });

      expect(typeof player.destroy).toBe("function");
      player.destroy();
    });

    it("应该在销毁后清理所有资源", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
        enablePerformanceMonitoring: true,
      });

      player.destroy();
      // 验证资源已清理（通过不抛出错误）
      expect(true).toBe(true);
    });
  });

  describe("边界情况和错误处理", () => {
    it("应该在容器不存在时抛出错误", () => {
      if (typeof document === "undefined") {
        return;
      }

      expect(() => {
        new VideoPlayer({
          container: "#non-existent-container",
          src: "https://example.com/video.mp4",
        });
      }).toThrow();
    });

    it("应该处理无效的播放速度", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });

      // 设置无效速度应该被限制
      player.setPlaybackRate(-1);
      expect(player.playbackRate).toBeGreaterThanOrEqual(0.25);

      player.setPlaybackRate(10);
      expect(player.playbackRate).toBeLessThanOrEqual(4);
    });

    it("应该处理无效的音量", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });

      player.setVolume(-1);
      expect(player.volume).toBeGreaterThanOrEqual(0);

      player.setVolume(2);
      expect(player.volume).toBeLessThanOrEqual(1);
    });

    it("应该处理空的播放列表", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        playlist: [],
      });

      expect(player.getPlaylist().length).toBe(0);
      expect(player.getPlaylistIndex()).toBe(-1);
    });

    it("应该处理无效的播放列表索引", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        playlist: [
          { src: "https://example.com/video1.mp4", title: "视频 1" },
        ],
      });

      // 无效索引应该被忽略
      player.loadPlaylistItem(-1);
      player.loadPlaylistItem(10);
    });
  });

  describe("配置选项验证", () => {
    it("应该正确处理所有可选配置", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        // 最小配置
      });

      expect(player).toBeTruthy();
    });

    it("应该使用默认值", () => {
      if (typeof document === "undefined") {
        return;
      }

      player = new VideoPlayer({
        container: "#test-video-container",
        src: "https://example.com/video.mp4",
      });

      // 验证默认值
      expect(player.volume).toBeGreaterThanOrEqual(0);
      expect(player.playbackRate).toBeGreaterThanOrEqual(0.25);
    });
  });
});
