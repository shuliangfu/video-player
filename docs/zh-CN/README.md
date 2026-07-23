# @dreamer/video-player

> 📖 中文 | [English](../../README.md)

> 一个视频播放器包，支持多种视频格式和流媒体协议，自动检测格式并选择最佳播放引擎。

[![JSR](https://jsr.io/badges/@dreamer/video-player)](https://jsr.io/@dreamer/video-player)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Tests](https://img.shields.io/badge/tests-94%20passed%20(3%20runtimes)-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

视频播放器包，支持多种视频格式（MP4、WebM、OGG）和流媒体协议（HLS、DASH、FLV、RTMP），自动检测视频格式并选择最佳播放引擎（原生播放器、HLS.js、DASH.js、FLV.js），提供统一的
API 接口。支持自适应码率、低延迟直播、画中画、视频截图等高级功能，全面兼容
Deno、Bun、Node.js 22+ 和浏览器环境。

---

## ✨ 特性

- **核心功能**：
  - 多格式支持（MP4, WebM, OGG, HLS, DASH, FLV, RTMP）
  - 流媒体支持（HLS 直播、DASH 自适应码率、FLV 流媒体）
  - 自动格式检测（根据 URL 自动识别格式并选择最佳引擎）
  - 引擎工厂模式（自动选择最佳播放器引擎：原生、HLS.js、DASH.js、FLV.js）
  - 降级策略（不支持时自动降级到原生播放器）
- **流媒体特性**：
  - 低延迟模式（HLS 支持低延迟直播）
  - 自适应码率（HLS/DASH 自动切换码率，根据网络状况优化）
  - 缓冲管理（智能缓冲策略，优化播放体验）
- **高级功能**：
  - 画中画支持
  - 视频截图功能
  - 质量切换控制
  - 播放历史记录
  - 设置记忆功能
  - 键盘快捷键支持
  - 字幕加载和样式自定义
- **性能优化**：
  - 事件节流优化
  - 内存管理
  - 智能预加载策略
  - 实时性能监控和报告生成
- **扩展功能**：
  - 视频下载支持（支持视频下载和进度跟踪）
  - 调试面板（实时调试面板显示播放器状态）
  - 统一 API（所有格式使用相同的 API 接口）

---

## 🎨 设计原则

__所有 @dreamer/_ 包都遵循以下原则_*：

- **主包（@dreamer/video-player）**：用于客户端（浏览器环境）
- **服务端支持**：通过运行时适配层支持 Deno 和 Bun 的测试环境

这样可以：

- 明确区分服务端和客户端代码
- 提供更好的类型安全和代码提示
- 支持更好的 tree-shaking

---

## 🎯 使用场景

- **视频网站**：在线视频播放、视频点播
- **直播平台**：HLS/DASH 直播流播放
- **教育平台**：课程视频播放、学习进度记录
- **企业应用**：内部视频培训、会议录制回放
- **移动应用**：响应式视频播放器

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/video-player
```

### Bun

```bash
bunx jsr add @dreamer/video-player
```

### Node.js 22+

```bash
npx jsr add @dreamer/video-player
```

> `src/` 为零依赖：仅使用类方法内守卫的浏览器全局变量
> （`document`/`window`/`HTMLVideoElement`），因此模块可在 Node.js 中无头加载（用于
> SSR/导入）。实例化需要浏览器（或 mock DOM）。npm 引擎
> （`hls.js`/`dashjs`/`flv.js`）在浏览器中通过 `window.Hls`/`flvjs` 全局加载，未在
> `src/` 中导入，因此 `package.json` 不附带运行时依赖。

---

## 🌍 环境兼容性

| 环境       | 版本要求   | 状态                                                                       |
| ---------- | ---------- | -------------------------------------------------------------------------- |
| **Deno**   | 2.6+       | ✅ 完全支持（测试环境）                                                    |
| **Bun**    | 1.3+       | ✅ 完全支持（测试环境）                                                    |
| **Node.js**| 22+        | ✅ 完全支持（自 v1.1.0；测试环境，src 可无头导入）                         |
| **浏览器** | 现代浏览器 | ✅ 完全支持（Chrome、Firefox、Safari、Edge）                               |
| **依赖**   | -          | 📦 需要 `npm:hls.js`、`npm:dashjs`、`npm:flv.js`（可选，根据格式自动加载） |

---

## 🚀 快速开始

### 基础使用（自动检测格式）

```typescript
import { VideoPlayer } from "@dreamer/video-player";

// 自动检测格式并选择引擎
const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.m3u8", // 自动使用 HLS 引擎
});

player.on("play", () => {
  console.log("开始播放");
});

player.play();
```

### HLS 流媒体（直播）

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/live.m3u8",
  hls: {
    lowLatencyMode: true, // 低延迟模式
    enableWorker: true, // 启用 Worker
    maxBufferLength: 30, // 最大缓冲长度
    backBufferLength: 90, // 后缓冲长度
  },
});

player.play();
```

### DASH 流媒体

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mpd",
  dash: {
    streaming: {
      delay: {
        liveDelay: 3, // 直播延迟
        liveDelayFragmentCount: 3, // 延迟片段数
      },
    },
    abr: {
      autoSwitchBitrate: {
        video: true, // 视频自适应码率
        audio: true, // 音频自适应码率
      },
    },
  },
});

player.play();
```

### 启用播放历史和设置记忆

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mp4",
  enablePlaybackHistory: true, // 启用断点续播
  saveSettings: true, // 保存音量、速度等设置
  preloadStrategy: "smart", // 智能预加载下一个视频
});

// 播放历史会自动保存和恢复
// 设置会自动保存和恢复
```

### 播放列表

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  playlist: [
    {
      src: "https://example.com/video1.mp4",
      title: "视频 1",
    },
    {
      src: "https://example.com/video2.m3u8",
      title: "视频 2",
    },
    {
      src: "https://example.com/video3.mpd",
      title: "视频 3",
    },
  ],
  playlistLoop: "all", // 循环播放列表
  shufflePlaylist: false, // 随机播放
  preloadStrategy: "smart", // 智能预加载
});

// 播放下一首
player.next();

// 播放上一首
player.previous();
```

### 高级功能

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mp4",
  keyboardShortcuts: true, // 启用键盘快捷键
  enablePerformanceMonitoring: true, // 启用性能监控
  showDebugPanel: true, // 显示调试面板
  autoQualitySwitch: true, // 自动质量切换
});

// 画中画
await player.enterPictureInPicture();

// 截图
const imageData = player.captureFrame("image/png");

// 获取性能数据
const performanceData = player.getPerformanceData();

// 显示调试面板
player.showDebugPanel();
```

---

## 📚 API 文档

### VideoPlayer

#### 构造函数

```typescript
new VideoPlayer(options: VideoPlayerOptions)
```

**配置选项**：

| 选项                          | 类型                                        | 默认值                         | 说明                         |
| ----------------------------- | ------------------------------------------- | ------------------------------ | ---------------------------- |
| `container`                   | `string \| HTMLElement`                     | -                              | 视频容器元素或选择器（必填） |
| `src`                         | `string \| string[]`                        | -                              | 初始视频源 URL               |
| `autoplay`                    | `boolean`                                   | `false`                        | 是否自动播放                 |
| `controls`                    | `boolean`                                   | `true`                         | 是否显示控制栏               |
| `volume`                      | `number`                                    | `1`                            | 初始音量 (0-1)               |
| `playbackRate`                | `number`                                    | `1`                            | 初始播放速度 (0.25-4)        |
| `muted`                       | `boolean`                                   | `false`                        | 是否静音                     |
| `loop`                        | `boolean`                                   | `false`                        | 是否循环播放                 |
| `preload`                     | `'none' \| 'metadata' \| 'auto'`            | `'metadata'`                   | 预加载策略                   |
| `hls`                         | `HLSConfig`                                 | -                              | HLS 配置选项                 |
| `dash`                        | `DASHConfig`                                | -                              | DASH 配置选项                |
| `flv`                         | `FLVConfig`                                 | -                              | FLV 配置选项                 |
| `enablePlaybackHistory`       | `boolean`                                   | `false`                        | 启用播放历史（断点续播）     |
| `saveSettings`                | `boolean`                                   | `false`                        | 保存播放器设置               |
| `preloadStrategy`             | `'none' \| 'metadata' \| 'auto' \| 'smart'` | `'metadata'`                   | 预加载策略                   |
| `keyboardShortcuts`           | `boolean`                                   | `true`                         | 启用键盘快捷键               |
| `enablePerformanceMonitoring` | `boolean`                                   | `false`                        | 启用性能监控                 |
| `showDebugPanel`              | `boolean`                                   | `false`                        | 显示调试面板                 |
| `autoQualitySwitch`           | `boolean`                                   | `false`                        | 自动质量切换                 |
| `playlistLoop`                | `'none' \| 'one' \| 'all'`                  | `'none'`                       | 播放列表循环模式             |
| `shufflePlaylist`             | `boolean`                                   | `false`                        | 播放列表随机播放             |
| `playbackRatePresets`         | `number[]`                                  | `[0.5, 0.75, 1, 1.25, 1.5, 2]` | 播放速度预设                 |
| `debug`                       | `boolean`                                   | `false`                        | 启用调试模式                 |
| `maxRetries`                  | `number`                                    | `3`                            | 最大重试次数                 |

#### 播放控制方法

| 方法                                  | 说明           |
| ------------------------------------- | -------------- |
| `play(): Promise<void>`               | 播放视频       |
| `pause(): void`                       | 暂停视频       |
| `seek(time: number): void`            | 跳转到指定时间 |
| `setVolume(volume: number): void`     | 设置音量       |
| `setPlaybackRate(rate: number): void` | 设置播放速度   |
| `toggleMute(): void`                  | 切换静音       |
| `requestFullscreen(): Promise<void>`  | 进入全屏       |
| `exitFullscreen(): Promise<void>`     | 退出全屏       |
| `isFullscreen(): boolean`             | 检查是否全屏   |

#### 高级功能方法

| 方法                                                      | 说明                         |
| --------------------------------------------------------- | ---------------------------- |
| `enterPictureInPicture(): Promise<void>`                  | 进入画中画模式               |
| `exitPictureInPicture(): Promise<void>`                   | 退出画中画模式               |
| `isPictureInPictureSupported(): boolean`                  | 检查是否支持画中画           |
| `isInPictureInPicture(): boolean`                         | 检查是否处于画中画模式       |
| `captureFrame(format?: string, quality?: number): string` | 截取当前帧                   |
| `getQualityLevels(): QualityLevel[]`                      | 获取可用质量级别（HLS/DASH） |
| `setQualityLevel(index: number): boolean`                 | 设置播放质量级别             |
| `getCurrentQualityLevel(): number`                        | 获取当前质量级别             |
| `getPlaybackStats(): PlaybackStats`                       | 获取播放统计信息             |
| `resetPlaybackStats(): void`                              | 重置播放统计                 |
| `getPlaybackHistory(src?: string): PlaybackHistory[]`     | 获取播放历史                 |
| `clearPlaybackHistory(src?: string): void`                | 清除播放历史                 |
| `setSubtitleStyle(style: SubtitleStyle): void`            | 设置字幕样式                 |
| `downloadVideo(options?: DownloadOptions): Promise<Blob>` | 下载视频                     |
| `getPerformanceData(): PerformanceData`                   | 获取性能数据                 |
| `generatePerformanceReport(): PerformanceReport`          | 生成性能报告                 |
| `showDebugPanel(): void`                                  | 显示调试面板                 |
| `hideDebugPanel(): void`                                  | 隐藏调试面板                 |
| `showKeyboardShortcutsHelp(): void`                       | 显示键盘快捷键帮助           |

#### 播放列表方法

| 方法                                                                           | 说明             |
| ------------------------------------------------------------------------------ | ---------------- |
| `setPlaylist(playlist: PlaylistItem[]): void`                                  | 设置播放列表     |
| `getPlaylist(): PlaylistItem[]`                                                | 获取播放列表     |
| `addToPlaylist(item: PlaylistItem): void`                                      | 添加到播放列表   |
| `removeFromPlaylist(index: number): void`                                      | 从播放列表移除   |
| `next(): boolean`                                                              | 播放下一首       |
| `previous(): boolean`                                                          | 播放上一首       |
| `loadPlaylistItem(index: number, options?: Partial<VideoPlayerOptions>): void` | 加载播放列表项   |
| `searchPlaylist(query: string): PlaylistItem[]`                                | 搜索播放列表     |
| `jumpToPlaylistItem(index: number): void`                                      | 跳转到播放列表项 |

#### 事件系统

```typescript
player.on("play", () => {
  console.log("开始播放");
});

player.on("pause", () => {
  console.log("已暂停");
});

player.on("timeupdate", () => {
  console.log(`当前时间: ${player.currentTime}`);
});

player.on("playbackrestored", ({ position }) => {
  console.log(`恢复播放位置: ${position}秒`);
});

player.on("qualitychange", ({ index }) => {
  console.log(`质量切换: ${index}`);
});
```

**支持的事件**：

| 事件                     | 说明                |
| ------------------------ | ------------------- |
| `loadstart`              | 开始加载            |
| `loadedmetadata`         | 元数据加载完成      |
| `loadeddata`             | 数据加载完成        |
| `progress`               | 加载进度            |
| `canplay`                | 可以播放            |
| `canplaythrough`         | 可以播放到底        |
| `play`                   | 开始播放            |
| `pause`                  | 暂停                |
| `ended`                  | 播放结束            |
| `timeupdate`             | 时间更新            |
| `volumechange`           | 音量变化            |
| `ratechange`             | 播放速度变化        |
| `seeking`                | 正在跳转            |
| `seeked`                 | 跳转完成            |
| `waiting`                | 等待缓冲            |
| `error`                  | 播放错误            |
| `fullscreenchange`       | 全屏状态变化        |
| `playlistchange`         | 播放列表变化        |
| `playlistitemchange`     | 播放列表项变化      |
| `pictureinpictureenter`  | 进入画中画          |
| `pictureinpictureleave`  | 退出画中画          |
| `qualitychange`          | 质量切换            |
| `playbackrestored`       | 播放位置恢复        |
| `preloadcomplete`        | 预加载完成          |
| `connectionstatuschange` | 连接状态变化（FLV） |
| `performanceupdate`      | 性能数据更新        |

---

## 🎨 使用示例

### 示例 1：HLS 直播流

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/live.m3u8",
  hls: {
    lowLatencyMode: true,
    enableWorker: true,
  },
  autoplay: true,
  enablePlaybackHistory: true,
});

player.on("play", () => {
  console.log("直播开始播放");
});

player.on("error", (error) => {
  console.error("播放错误:", error);
});
```

### 示例 2：多格式播放列表

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  playlist: [
    {
      src: "https://example.com/video1.mp4",
      title: "MP4 视频",
    },
    {
      src: "https://example.com/video2.m3u8",
      title: "HLS 流媒体",
    },
    {
      src: "https://example.com/video3.mpd",
      title: "DASH 流媒体",
    },
  ],
  preloadStrategy: "smart",
});

player.on("playlistitemchange", (item) => {
  console.log(`切换到: ${item.title}`);
});
```

### 示例 3：画中画和截图

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mp4",
});

// 进入画中画
document.getElementById("pip-btn")?.addEventListener("click", async () => {
  try {
    await player.enterPictureInPicture();
  } catch (error) {
    console.error("画中画不支持:", error);
  }
});

// 截图
document.getElementById("capture-btn")?.addEventListener("click", () => {
  const imageData = player.captureFrame("image/png");
  const link = document.createElement("a");
  link.download = "screenshot.png";
  link.href = imageData;
  link.click();
});
```

### 示例 4：质量切换

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.m3u8",
});

// 获取可用质量级别
const qualities = player.getQualityLevels();

// 创建质量选择器
qualities.forEach((quality, index) => {
  const option = document.createElement("option");
  option.value = index.toString();
  option.textContent = quality.label;
  qualitySelect.appendChild(option);
});

qualitySelect.addEventListener("change", (e) => {
  const index = parseInt((e.target as HTMLSelectElement).value);
  player.setQualityLevel(index);
});
```

### 示例 5：性能监控

```typescript
import { VideoPlayer } from "@dreamer/video-player";

const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mp4",
  enablePerformanceMonitoring: true,
});

// 获取性能数据
const performanceData = player.getPerformanceData();
console.log("FPS:", performanceData.fps);
console.log("丢帧数:", performanceData.droppedFrames);
console.log("缓冲效率:", performanceData.bufferingEfficiency);

// 生成性能报告
const report = player.generatePerformanceReport();
console.log("性能报告:", report);
```

---

## 🔧 高级配置

### HLS 配置

```typescript
const hlsConfig = {
  enableWorker: true, // 启用 Worker
  lowLatencyMode: true, // 低延迟模式
  backBufferLength: 90, // 后缓冲长度（秒）
  maxBufferLength: 30, // 最大缓冲长度（秒）
  maxMaxBufferLength: 600, // 最大最大缓冲长度（秒）
  startLevel: -1, // 起始质量级别（-1 为自动）
  capLevelToPlayerSize: true, // 根据播放器大小限制质量
};
```

### DASH 配置

```typescript
const dashConfig = {
  streaming: {
    delay: {
      liveDelay: 3, // 直播延迟（秒）
      liveDelayFragmentCount: 3, // 延迟片段数
    },
  },
  abr: {
    autoSwitchBitrate: {
      video: true, // 视频自适应码率
      audio: true, // 音频自适应码率
    },
  },
};
```

### FLV 配置

```typescript
const flvConfig = {
  enableWorker: true, // 启用 Worker
  enableStashBuffer: true, // 启用 Stash 缓冲
  stashInitialSize: 128 * 1024, // Stash 初始大小（字节）
  autoPlay: false, // 是否自动播放
  autoReconnect: true, // 自动重连
  maxReconnectAttempts: 3, // 最大重连次数
  reconnectDelay: 1000, // 重连延迟（毫秒）
};
```

---

## 📊 格式支持矩阵

| 浏览器  | MP4 | WebM | OGG | AV1 | HLS (原生) | HLS (hls.js) | DASH | FLV |
| ------- | --- | ---- | --- | --- | ---------- | ------------ | ---- | --- |
| Chrome  | ✅  | ✅   | ✅  | ✅  | ❌         | ✅           | ✅   | ✅  |
| Firefox | ✅  | ✅   | ✅  | ✅  | ❌         | ✅           | ✅   | ✅  |
| Safari  | ✅  | ❌   | ❌  | ⚠️* | ✅         | ✅           | ❌   | ❌  |
| Edge    | ✅  | ✅   | ✅  | ✅  | ❌         | ✅           | ✅   | ✅  |

\* Safari 17+ 在支持 AV1 硬件解码的设备上支持（A17 Pro, M3, M4 系列芯片）

---

## 🎯 最佳实践

### 1. 优先使用自动检测

```typescript
// ✅ 推荐：自动检测格式
const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.m3u8", // 自动使用 HLS 引擎
});

// ❌ 不推荐：手动指定格式（除非必要）
```

### 2. 配置流媒体选项

```typescript
// HLS 直播流
const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/live.m3u8",
  hls: {
    lowLatencyMode: true, // 低延迟模式
    maxBufferLength: 10, // 减少缓冲延迟
  },
});
```

### 3. 启用播放历史和设置记忆

```typescript
const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.mp4",
  enablePlaybackHistory: true, // 断点续播
  saveSettings: true, // 记住音量、速度等
  preloadStrategy: "smart", // 智能预加载
});
```

### 4. 错误处理和重试

```typescript
const player = new VideoPlayer({
  container: "#video-container",
  src: "https://example.com/video.m3u8",
  maxRetries: 3, // 最大重试次数
});

player.on("error", (error) => {
  console.error("播放错误:", error);
  // 可以尝试切换到其他格式
});
```

---

## 🚀 性能优化

### 已实现的优化

1. **事件节流**：`timeupdate` 事件每 250ms 最多触发一次，降低 CPU 占用
2. **事件防抖**：`volumechange` 事件 300ms 防抖，减少不必要的处理
3. **内存管理**：引擎切换时完全清理资源，避免内存泄漏
4. **智能预加载**：播放到 80% 时预加载下一个视频的元数据
5. **网络监控**：自动检测网络状态，调整预加载策略
6. **缓冲优化**：根据网络状况自动调整缓冲策略

### 性能建议

- 使用 `preloadStrategy: "smart"` 启用智能预加载
- 对于长视频，启用 `enablePlaybackHistory` 支持断点续播
- 使用 `saveSettings` 记住用户偏好，提升体验
- 启用 `enablePerformanceMonitoring` 监控播放性能

---

## ⌨️ 键盘快捷键

| 快捷键  | 功能                        |
| ------- | --------------------------- |
| `空格`  | 播放/暂停                   |
| `←` `→` | 快退/快进 10 秒             |
| `↑` `↓` | 音量增减                    |
| `M`     | 静音/取消静音               |
| `F`     | 全屏/退出全屏               |
| `P`     | 画中画                      |
| `[` `]` | 播放速度增减                |
| `=` `-` | 切换到下一个/上一个速度预设 |
| `0`     | 重置播放速度为 1x           |
| `S`     | 截图                        |
| `Q`     | 切换质量                    |
| `C`     | 切换字幕                    |
| `H`     | 显示快捷键帮助              |

---

## 🐛 已知问题和限制

### 1. RTMP 流转换

- **问题**: RTMP URL 无法直接转换为 HTTP-FLV URL
- **状态**: ⚠️ 部分实现
- **说明**: 需要服务器端支持 RTMP 到 HTTP-FLV 的转换
- **解决方案**: 使用 HTTP-FLV URL 或配置 RTMP 转 HTTP-FLV 服务器

### 2. Safari AV1 支持

- **问题**: Safari 对 AV1 的支持有限
- **状态**: ⚠️ 部分支持
- **说明**: 仅在支持 AV1 硬件解码的设备上支持（A17 Pro, M3, M4 系列芯片）
- **解决方案**: 提供 H.264 或 HLS 备用源

---

## 📚 相关文档

- [TEST_REPORT.md](./TEST_REPORT.md) - 测试报告
- [OPTIMIZATION-PLAN.md](./OPTIMIZATION-PLAN.md) - 优化计划
- [FURTHER-OPTIMIZATION.md](./FURTHER-OPTIMIZATION.md) - 进一步优化
- [tests/README-BROWSER-TESTING.md](./tests/README-BROWSER-TESTING.md) -
  浏览器测试文档
- [tests/README-COMPATIBILITY.md](./tests/README-COMPATIBILITY.md) -
  兼容性测试文档

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
