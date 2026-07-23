# 变更日志

@dreamer/video-player 的所有重要变更均记录于此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.1.0] - 2026-07-23

### 新增

- **Node.js 22+ 兼容**：第三个支持的运行时（与 Deno、Bun 并列）。包现在附带
  `package.json`（零运行时依赖——`src/` 无依赖）、`tsconfig.json` 和 `test:node`
  任务（`tsx --test --test-force-exit`），单元测试套件可在 Node 22 下运行。
- **`@dreamer/test` 支持 Node**：单元测试在三端均通过 `@dreamer/test` 运行。
- **`.npmrc`**：`@jsr:registry=https://npm.jsr.io`，使 `npm`/`bun` 能解析
  `npm:@jsr/dreamer__*` 别名。

### 变更

- **测试 mock 针对 Node 加固**：`navigator` 改用 `Object.defineProperty` 安装
  （Node 22+ 将 `navigator` 暴露为只读 getter，严格模式下直接赋值会抛错）。
  `setupMockDOM` 中补全 `globalThis.addEventListener`/`removeEventListener`
  polyfill，因为 Node 的 `globalThis` 不是 `EventTarget`（播放器在 `globalThis`
  上注册 `online`/`offline` 监听器）。
- **`src/` 无需修改**：所有浏览器全局变量（`document`/`window`/
  `HTMLVideoElement`）均在类方法内守卫，因此模块可在 Node 中无头导入。定时器字段
  保留原始 `number` 类型与 `as unknown as number` 转换（Deno 的 Node 兼容全局使
  `ReturnType<typeof setTimeout>` 解析为 `Timeout`，与调用处的 `number` 冲突）。
- **升级依赖**：`@dreamer/runtime-adapter` → `^1.2.2`、`@dreamer/logger` →
  `^1.1.0`、`@dreamer/test` → `^1.2.3`。
- **移除 `package.json` 运行时依赖**：`hls.js`/`dashjs`/`flv.js` 保留在
  `deno.json` imports 中（供本地浏览器测试使用），但从 `package.json` 依赖中移除
  ——`src/` 通过 `window.Hls`/`flvjs` 全局加载它们，从不导入。
- **`deno.json` 新增 `minimumDependencyAge: 0`**。

### CI

- 9 任务矩阵（Deno 2.9 / Bun 1.3 / Node 22 × Linux/macOS/Windows），仅运行 4 个
  单元测试套件（`engines`、`player`、`integration`、`utils`）。不安装 Chromium。
  Playwright 浏览器测试（`tests/browser.test.ts`）拆分为本地 `test:browser` 任务，
  不纳入 CI。

### 测试

- **三端单元测试套件**：Deno 98 通过（94 单元 + 4 生命周期钩子）/ Bun 94 通过 /
  Node 94 通过——100% 通过率。

### 兼容性

- **Deno**：2.6+
- **Bun**：1.3+
- **Node.js**：22+（自 v1.1.0）
- **浏览器**：支持 ES2020 的现代浏览器，并按格式提供所需编解码器/API 支持。

---

## [1.0.0] - 2026-02-20

### 新增

- **首个稳定版发布**：正式 1.0.0 版本，公共 API 稳定。

- **视频播放器核心（`VideoPlayer`）**：
  - 所有支持的格式与流媒体协议统一为同一套 API。
  - 构造选项：`container`、`src`、`playlist`、`autoDetectFormat`、`fallbackToNative`，以及各引擎选项（`hls`、`dash`、`flv`）。
  - 播放控制：`play()`、`pause()`、`seek(time)`、`setVolume(volume)`、`setPlaybackRate(rate)`。
  - 播放列表：`getPlaylist()`、`next()`、`previous()`，以及选项中的 `playlist`。
  - 事件系统：`on(event, callback)`、`off(event, callback)`，支持
    `play`、`pause`、`ended`、`timeupdate`、`error`、`qualitychange` 等。
  - 状态与统计：`getState()`、`getPlaybackStats()`、`getPerformanceData()`。

- **格式与引擎支持**：
  - **原生格式**：MP4、WebM、OGG，通过浏览器原生 `<video>`。
  - **HLS**：`.m3u8`，基于 HLS.js，可选低延迟、Worker、缓冲参数。
  - **DASH**：`.mpd`，基于 DASH.js，自适应码率。
  - **FLV**：`.flv`，基于 FLV.js，HTTP-FLV 流。
  - **自动格式检测**：`detectVideoFormat(url)`
    与引擎选择（原生、HLS.js、DASH.js、FLV.js），可选回退到原生。

- **引擎类（高级用法可单独使用）**：
  - `NativePlayerEngine`、`HLSPlayerEngine`、`DASHPlayerEngine`、`FLVPlayerEngine`、`BasePlayerEngine`。
  - `PlayerEngineFactory` 按格式创建对应引擎。

- **流媒体与画质**：
  - 自适应码率（HLS/DASH）。
  - HLS 低延迟选项。
  - 画质级别：`getQualityLevels()`、`setQuality(level)`（在支持的引擎下）。
  - 缓冲状态与网络信息钩子。

- **高级功能**：
  - 画中画：`requestPictureInPicture()`、`exitPictureInPicture()`、`isPictureInPictureSupported()`。
  - 全屏：`requestFullscreen()`、`exitFullscreen()`、`isFullscreen()`。
  - 截图：`captureFrame()` 返回 data URL。
  - 播放历史（断点续播）：`enablePlaybackHistory`、`getPlaybackHistory()`、`clearPlaybackHistory()`。
  - 设置持久化：`saveSettings`、`getPlayerSettings()`、`clearPlayerSettings()`（音量、倍速、静音等）。
  - 字幕：字幕轨与样式选项。
  - 键盘快捷键（可选）。
  - 视频下载及进度（在支持的场景下）。
  - 调试面板（开发用，可选）。

- **工具**：
  - `StorageManager`：`savePlaybackHistory()`、`getPlaybackHistory()`、`getPlaybackPosition()`、`clearPlaybackHistory()`、`savePlayerSettings()`、`getPlayerSettings()`、`clearPlayerSettings()`。
  - 格式检测：`detectVideoFormat()`、`getRecommendedFormats()`、`VideoFormat`
    枚举、`isSafari()`、`isIOSSafari()`、`isAV1Supported()`、`isSafariAV1Supported()`。

- **类型与导出**：
  - 类型：`VideoPlayerOptions`、`PlayerEvent`、`PlayerState`、`PlaybackStats`、`PlaylistItem`、`QualityLevel`、`HLSConfig`、`DASHConfig`、`FLVConfig`、`PlaybackHistory`、`PlayerSettings`、`SubtitleTrack`、`SubtitleStyle`
    及相关接口。

- **包导出**：
  - 主入口：`@dreamer/video-player`（或 `jsr:@dreamer/video-player`）—
    播放器、引擎、工具与类型。
  - 子路径：`@dreamer/video-player/player` — 仅 `VideoPlayer` 类。

- **运行环境**：
  - 支持 **Deno** 2.6+、**Bun** 1.3.5+
    及现代**浏览器**（Chrome、Firefox、Safari、Edge）。
  - 测试中使用 `@dreamer/runtime-adapter`
    做文件/环境/路径适配；可选：`@dreamer/logger`、`@dreamer/test`。
  - 可选 npm 依赖（按需加载）：`hls.js`、`dashjs`、`flv.js`。

### 兼容性

- **Deno**：2.6+
- **Bun**：1.3.5+
- **浏览器**：支持 ES2020 及对应格式所需编解码器/API 的现代浏览器。
