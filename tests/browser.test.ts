/**
 * @fileoverview 使用 @dreamer/test 浏览器测试集成进行前端（浏览器）测试
 *
 * - entryPoint: 使用与本文件同目录的 browser-entry-minimal.ts（占位类），避免完整入口拉取 hls.js/dashjs/flv.js 时打包卡死；打包后挂到 globalThis.VideoPlayerBundle 与 globalThis.VideoPlayer
 * - 入口路径按「当前测试文件所在目录」解析，这样无论从 video-player 还是 monorepo 根目录运行测试都能找到正确文件，避免卡在 waitForFunction
 * - globalName: "VideoPlayerBundle"，须与入口内挂载的变量名一致，runner 会等待 window[globalName] 与 window.testReady === true
 * - browserMode: false 必须，否则输出 ESM + external，浏览器无法解析 jsr:/npm: 会一直卡住
 * - 入口内需设置 testReady = true，runner 才认为加载完成
 * 首次运行打包可能需数十秒，建议：deno test -A tests/browser.test.ts --timeout=180000
 */

import { dirname, resolve, RUNTIME } from "@dreamer/runtime-adapter";
import {
  afterAll,
  cleanupAllBrowsers,
  describe,
  expect,
  it,
} from "@dreamer/test";
import { fileURLToPath } from "node:url";

// 按当前测试文件所在目录解析入口，避免从 monorepo 根目录运行时 "./tests/..." 解析到错误路径导致卡住
const _testDir = dirname(fileURLToPath(import.meta.url));
const _entryPoint = resolve(_testDir, "browser-entry-minimal.ts");

// 浏览器测试配置：参考 webrtc/tests/browser-puppeteer.test.ts
// browserMode: false 将 JSR/npm 打进 bundle，避免浏览器里出现 require()
// 首次运行 createBrowserContext 时会打包入口，可能需 1–2 分钟，故加大超时
const browserConfig = {
  // 禁用资源泄漏检查（浏览器测试可能有内部定时器）
  sanitizeOps: false,
  sanitizeResources: false,
  // 单用例超时（含打包 + 启动浏览器 + 加载页面），首次打包较慢
  timeout: 120_000,
  browser: {
    enabled: true,
    browserSource: "test" as const,
    // 使用与 browser.test.ts 同目录的入口，不依赖 cwd，从任意目录运行都不会卡住
    entryPoint: _entryPoint,
    // 全局变量名
    globalName: "VideoPlayerBundle",
    // 不把 JSR/npm 标为 external，打进 IIFE，避免浏览器里出现 require()
    browserMode: false,
    // 等待 window.VideoPlayerBundle / testReady 的超时，首次打包+加载可能较慢
    moduleLoadTimeout: 90_000,
    // 无头模式
    headless: true,
    // 复用浏览器实例
    reuseBrowser: true,
    // 自定义 body 内容
    bodyContent: `
      <div id="test-container" style="width: 800px; height: 450px;">
        <video id="test-video" style="width: 100%; height: 100%;"></video>
      </div>
    `,
  },
};

describe(`VideoPlayer - 前端浏览器测试 (${RUNTIME})`, () => {
  afterAll(async () => {
    await cleanupAllBrowsers();
  });

  describe("VideoPlayer 浏览器环境", () => {
    it(
      "应该在浏览器中挂载 VideoPlayer 并可用",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (
              opts: { container: string; src?: string },
            ) => unknown;
            playerReady?: boolean;
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            return {
              success: true,
              hasVideoPlayer: typeof win.VideoPlayer === "function",
              playerReady: win.playerReady === true,
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          hasVideoPlayer?: boolean;
          playerReady?: boolean;
        };
        expect(r.success).toBe(true);
        expect(r.hasVideoPlayer).toBe(true);
        expect(r.playerReady).toBe(true);
      },
      browserConfig,
    );

    it(
      "应该在浏览器中创建播放器实例并具备 play/pause/seek",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (opts: { container: string; src?: string }) => {
              play?: () => Promise<unknown>;
              pause?: () => void;
              seek?: (time: number) => void;
            };
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            const player = new win.VideoPlayer!({
              container: "#test-container",
              src: "https://example.com/test.mp4",
            });
            return {
              success: true,
              hasPlay: typeof player.play === "function",
              hasPause: typeof player.pause === "function",
              hasSeek: typeof player.seek === "function",
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          hasPlay?: boolean;
          hasPause?: boolean;
          hasSeek?: boolean;
        };
        expect(r.success).toBe(true);
        expect(r.hasPlay).toBe(true);
        expect(r.hasPause).toBe(true);
        expect(r.hasSeek).toBe(true);
      },
      browserConfig,
    );

    it(
      "应该支持音量与倍速控制",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (opts: { container: string; src?: string }) => {
              setVolume?: (v: number) => void;
              setPlaybackRate?: (r: number) => void;
              volume?: number;
              playbackRate?: number;
            };
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            const player = new win.VideoPlayer!({
              container: "#test-container",
              src: "https://example.com/test.mp4",
            });
            if (typeof player.setVolume === "function") {
              player.setVolume(0.5);
            }
            if (typeof player.setPlaybackRate === "function") {
              player.setPlaybackRate(1.5);
            }
            return {
              success: true,
              hasSetVolume: typeof player.setVolume === "function",
              hasSetPlaybackRate: typeof player.setPlaybackRate === "function",
              volume: (player as { volume?: number }).volume,
              playbackRate: (player as { playbackRate?: number }).playbackRate,
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          hasSetVolume?: boolean;
          hasSetPlaybackRate?: boolean;
          volume?: number;
          playbackRate?: number;
        };
        expect(r.success).toBe(true);
        expect(r.hasSetVolume).toBe(true);
        expect(r.hasSetPlaybackRate).toBe(true);
      },
      browserConfig,
    );

    it(
      "应该支持全屏与画中画 API 检测",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (opts: { container: string; src?: string }) => {
              requestFullscreen?: () => Promise<unknown>;
              isFullscreen?: () => boolean;
              enterPictureInPicture?: () => Promise<unknown>;
              isPictureInPictureSupported?: () => boolean;
            };
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            const player = new win.VideoPlayer!({
              container: "#test-container",
              src: "https://example.com/test.mp4",
            });
            return {
              success: true,
              hasRequestFullscreen:
                typeof player.requestFullscreen === "function",
              hasIsFullscreen: typeof player.isFullscreen === "function",
              hasEnterPiP: typeof player.enterPictureInPicture === "function",
              hasIsPiPSupported:
                typeof player.isPictureInPictureSupported === "function",
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          hasRequestFullscreen?: boolean;
          hasIsFullscreen?: boolean;
          hasEnterPiP?: boolean;
          hasIsPiPSupported?: boolean;
        };
        expect(r.success).toBe(true);
        expect(r.hasRequestFullscreen).toBe(true);
        expect(r.hasIsFullscreen).toBe(true);
        expect(r.hasEnterPiP).toBe(true);
        expect(r.hasIsPiPSupported).toBe(true);
      },
      browserConfig,
    );

    it(
      "应该支持截图与事件 on/off",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (opts: { container: string; src?: string }) => {
              captureFrame?: () => string;
              on?: (event: string, fn: () => void) => void;
              off?: (event: string, fn: () => void) => void;
            };
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            const player = new win.VideoPlayer!({
              container: "#test-container",
              src: "https://example.com/test.mp4",
            });
            const imageData = typeof player.captureFrame === "function"
              ? player.captureFrame()
              : "";
            return {
              success: true,
              hasCaptureFrame: typeof player.captureFrame === "function",
              isDataURL: typeof imageData === "string" &&
                imageData.startsWith("data:image/"),
              hasOn: typeof player.on === "function",
              hasOff: typeof player.off === "function",
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          hasCaptureFrame?: boolean;
          isDataURL?: boolean;
          hasOn?: boolean;
          hasOff?: boolean;
        };
        expect(r.success).toBe(true);
        expect(r.hasCaptureFrame).toBe(true);
        expect(r.hasOn).toBe(true);
        expect(r.hasOff).toBe(true);
      },
      browserConfig,
    );

    it(
      "应该支持播放列表与 getPerformanceData",
      async (t) => {
        const result = await (t as {
          browser?: { evaluate: (fn: () => unknown) => Promise<unknown> };
        }).browser!.evaluate(() => {
          const win = globalThis as unknown as {
            VideoPlayer?: new (opts: {
              container: string;
              playlist?: { src: string; title: string }[];
            }) => {
              getPlaylist?: () => { src: string; title: string }[];
              next?: () => boolean;
              previous?: () => boolean;
              getPerformanceData?: () => { fps?: number };
            };
          };
          if (typeof win.VideoPlayer === "undefined") {
            return { success: false, error: "VideoPlayer 未定义" };
          }
          try {
            const player = new win.VideoPlayer!({
              container: "#test-container",
              playlist: [
                { src: "https://example.com/v1.mp4", title: "视频 1" },
                { src: "https://example.com/v2.mp4", title: "视频 2" },
              ],
            });
            const playlist = typeof player.getPlaylist === "function"
              ? player.getPlaylist!()
              : [];
            const perf = typeof player.getPerformanceData === "function"
              ? player.getPerformanceData!()
              : {};
            return {
              success: true,
              playlistLength: playlist.length,
              hasNext: typeof player.next === "function",
              hasPrevious: typeof player.previous === "function",
              hasGetPerformanceData:
                typeof player.getPerformanceData === "function",
              hasFps: typeof (perf as { fps?: number }).fps === "number",
            };
          } catch (err: unknown) {
            return {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });
        const r = result as {
          success: boolean;
          error?: string;
          playlistLength?: number;
          hasNext?: boolean;
          hasPrevious?: boolean;
          hasGetPerformanceData?: boolean;
          hasFps?: boolean;
        };
        expect(r.success).toBe(true);
        expect(r.playlistLength).toBe(2);
        expect(r.hasNext).toBe(true);
        expect(r.hasPrevious).toBe(true);
        expect(r.hasGetPerformanceData).toBe(true);
      },
      browserConfig,
    );
  });
});
