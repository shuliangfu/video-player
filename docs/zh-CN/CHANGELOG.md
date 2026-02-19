# 变更日志

@dreamer/video-player 的所有重要变更均记录于此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
