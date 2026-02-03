/**
 * 最小浏览器测试入口（用于定位卡住阶段）
 *
 * 不导入 mod.ts，只挂一个占位类 + testReady，用于验证：
 * - 若用本文件作 entryPoint 测试不卡 → 卡住原因在完整 bundle（打包或运行 mod 链）
 * - 若用本文件仍卡 → 卡住原因在浏览器启动或 runner 的 goto/waitFor
 *
 * 使用方式：在 browser.test.ts 里临时把 entryPoint 改为 "./tests/browser-entry-minimal.ts" 跑一次。
 */

const g = globalThis as unknown as {
  VideoPlayerBundle?: new (opts: { container: string; src?: string }) => unknown;
  VideoPlayer?: new (opts: { container: string; src?: string }) => unknown;
  testReady?: boolean;
};

// 简单的 stub 类
class VideoPlayerStub {
  constructor(_opts: { container: string; src?: string }) {}
}

// 必须与 browserConfig.globalName 一致，@dreamer/test 等待 window[globalName] 存在
g.VideoPlayerBundle = VideoPlayerStub;
// 同时也挂一个 VideoPlayer 供测试用例访问
g.VideoPlayer = VideoPlayerStub;
g.testReady = true;
