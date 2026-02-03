/**
 * @fileoverview 浏览器端测试入口
 *
 * 供 @dreamer/test 浏览器测试使用：将 VideoPlayer 挂到 globalThis，
 * 便于在 page.evaluate 中通过 window.VideoPlayer 创建实例并测试。
 * 本文件仅用于测试打包，不随库发布（位于 tests/ 下）。
 */

import { VideoPlayer } from "../src/mod.ts";

const g = globalThis as unknown as {
  // 必须与 browserConfig.globalName 一致
  VideoPlayerBundle?: typeof VideoPlayer;
  // 同时也挂 VideoPlayer 供测试用例访问
  VideoPlayer?: typeof VideoPlayer;
  playerReady?: boolean;
  testReady?: boolean;
};

// @dreamer/test 等待 window[globalName] 存在，所以必须挂 VideoPlayerBundle
g.VideoPlayerBundle = VideoPlayer;
g.VideoPlayer = VideoPlayer;
g.playerReady = true;
/** @dreamer/test 约定：设置后 runner 才认为模块加载完成 */
g.testReady = true;
