# 视频播放器优化方案

## 📊 当前实现分析

### 当前支持
- ✅ HTML5 原生视频格式（MP4, WebM, OGG）
- ✅ 基础播放控制
- ✅ 播放列表管理
- ✅ 字幕支持

### 限制
- ❌ 不支持 HLS (m3u8) 流媒体
- ❌ 不支持 DASH (mpd) 流媒体
- ❌ 不支持 RTMP 流媒体
- ❌ 不支持 FLV 格式
- ❌ 不支持 M3U8 播放列表
- ❌ 格式检测和自动适配不足

---

## 🎯 优化目标

### 1. 支持更多视频格式
- **HLS (HTTP Live Streaming)** - `.m3u8` 文件
- **DASH (Dynamic Adaptive Streaming)** - `.mpd` 文件
- **RTMP** - 实时流媒体协议
- **FLV** - Flash Video 格式
- **M3U8 播放列表** - 自适应码率流

### 2. 流媒体支持
- **HLS 直播** - 支持实时直播流
- **DASH 直播** - 支持 DASH 格式直播
- **自适应码率** - 根据网络自动切换码率
- **低延迟优化** - 减少播放延迟

### 3. 格式检测和自动适配
- **自动检测视频格式**
- **自动选择播放器引擎**
- **降级策略** - 不支持时自动降级

---

## 🔧 优化方案

### 方案一：使用第三方库（推荐）

#### 1.1 HLS.js - HLS 流媒体支持

**优点**：
- 成熟稳定，广泛使用
- 支持 HLS v3, v4, v5
- 支持自适应码率
- 支持低延迟模式
- 纯 JavaScript，无依赖

**实现**：
```typescript
import Hls from 'hls.js';

class HLSPlayer {
  private hls: Hls | null = null;

  load(src: string) {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true, // 低延迟模式
        backBufferLength: 90,
      });
      this.hls.loadSource(src);
      this.hls.attachMedia(this.video);
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生支持
      this.video.src = src;
    }
  }
}
```

#### 1.2 dash.js - DASH 流媒体支持

**优点**：
- 官方 DASH 播放器
- 支持自适应码率
- 支持 DRM
- 性能优秀

**实现**：
```typescript
import dashjs from 'dashjs';

class DASHPlayer {
  private player: dashjs.MediaPlayerClass | null = null;

  load(src: string) {
    this.player = dashjs.MediaPlayer().create();
    this.player.initialize(this.video, src, false);
    this.player.setAutoPlay(false);
  }
}
```

#### 1.3 flv.js - FLV 格式支持

**优点**：
- 支持 FLV 格式
- 支持 HTTP-FLV 流
- 性能好

**实现**：
```typescript
import flvjs from 'flv.js';

class FLVPlayer {
  private player: flvjs.Player | null = null;

  load(src: string) {
    if (flvjs.isSupported()) {
      this.player = flvjs.createPlayer({
        type: 'flv',
        url: src,
      });
      this.player.attachMediaElement(this.video);
      this.player.load();
    }
  }
}
```

### 方案二：格式检测和自动适配

#### 2.1 视频格式检测

```typescript
enum VideoFormat {
  MP4 = 'mp4',
  WEBM = 'webm',
  OGG = 'ogg',
  HLS = 'hls',      // .m3u8
  DASH = 'dash',    // .mpd
  FLV = 'flv',      // .flv
  RTMP = 'rtmp',    // rtmp://
  UNKNOWN = 'unknown',
}

function detectVideoFormat(src: string): VideoFormat {
  const url = new URL(src);
  const extension = url.pathname.split('.').pop()?.toLowerCase();

  if (src.startsWith('rtmp://')) {
    return VideoFormat.RTMP;
  }

  switch (extension) {
    case 'm3u8':
      return VideoFormat.HLS;
    case 'mpd':
      return VideoFormat.DASH;
    case 'flv':
      return VideoFormat.FLV;
    case 'mp4':
      return VideoFormat.MP4;
    case 'webm':
      return VideoFormat.WEBM;
    case 'ogg':
    case 'ogv':
      return VideoFormat.OGG;
    default:
      return VideoFormat.UNKNOWN;
  }
}
```

#### 2.2 播放器工厂模式

```typescript
interface VideoPlayerEngine {
  load(src: string): void;
  play(): Promise<void>;
  pause(): void;
  destroy(): void;
  on(event: string, callback: Function): void;
}

class PlayerFactory {
  static create(format: VideoFormat, video: HTMLVideoElement): VideoPlayerEngine {
    switch (format) {
      case VideoFormat.HLS:
        return new HLSPlayerEngine(video);
      case VideoFormat.DASH:
        return new DASHPlayerEngine(video);
      case VideoFormat.FLV:
        return new FLVPlayerEngine(video);
      case VideoFormat.RTMP:
        return new RTMPPlayerEngine(video);
      default:
        return new NativePlayerEngine(video);
    }
  }
}
```

### 方案三：统一播放器接口

#### 3.1 抽象播放器引擎

```typescript
abstract class BasePlayerEngine {
  protected video: HTMLVideoElement;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  abstract load(src: string): void;
  abstract play(): Promise<void>;
  abstract pause(): void;
  abstract seek(time: number): void;
  abstract setVolume(volume: number): void;
  abstract destroy(): void;

  // 通用方法
  getCurrentTime(): number {
    return this.video.currentTime;
  }

  getDuration(): number {
    return this.video.duration;
  }
}
```

#### 3.2 具体实现

```typescript
class NativePlayerEngine extends BasePlayerEngine {
  load(src: string): void {
    this.video.src = src;
  }

  async play(): Promise<void> {
    await this.video.play();
  }

  pause(): void {
    this.video.pause();
  }

  // ... 其他方法
}

class HLSPlayerEngine extends BasePlayerEngine {
  private hls: Hls | null = null;

  load(src: string): void {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      this.hls.loadSource(src);
      this.hls.attachMedia(this.video);
    } else {
      // 降级到原生
      this.video.src = src;
    }
  }

  // ... 其他方法
}
```

---

## 📦 依赖管理

### 推荐的第三方库

```json
{
  "imports": {
    "hls.js": "npm:hls.js@^1.4.12",
    "dashjs": "npm:dashjs@^4.7.4",
    "flv.js": "npm:flv.js@^1.6.2"
  }
}
```

### 可选依赖

- **hls.js** - HLS 流媒体（必需，如果支持 HLS）
- **dashjs** - DASH 流媒体（必需，如果支持 DASH）
- **flv.js** - FLV 格式（可选）
- **video.js** - 完整的播放器解决方案（可选，但会增加体积）

---

## 🎨 架构设计

### 新的类结构

```
VideoPlayer (主类)
  ├── PlayerEngineFactory (工厂)
  │   ├── detectFormat() - 检测格式
  │   └── createEngine() - 创建引擎
  │
  ├── Engines (播放器引擎)
  │   ├── BasePlayerEngine (抽象基类)
  │   ├── NativePlayerEngine (原生 HTML5)
  │   ├── HLSPlayerEngine (HLS.js)
  │   ├── DASHPlayerEngine (dash.js)
  │   ├── FLVPlayerEngine (flv.js)
  │   └── RTMPPlayerEngine (RTMP)
  │
  └── Utils (工具)
      ├── formatDetector.ts - 格式检测
      └── compatibility.ts - 兼容性检查
```

---

## 🚀 实施步骤

### 阶段一：基础架构（1-2天）
1. ✅ 创建格式检测工具
2. ✅ 创建播放器引擎抽象类
3. ✅ 实现原生播放器引擎
4. ✅ 实现播放器工厂

### 阶段二：HLS 支持（1-2天）
1. ✅ 集成 hls.js
2. ✅ 实现 HLSPlayerEngine
3. ✅ 添加 HLS 配置选项
4. ✅ 测试 HLS 流媒体

### 阶段三：DASH 支持（1-2天）
1. ✅ 集成 dashjs
2. ✅ 实现 DASHPlayerEngine
3. ✅ 添加 DASH 配置选项
4. ✅ 测试 DASH 流媒体

### 阶段四：其他格式（可选，1-2天）
1. ✅ 集成 flv.js（FLV 支持）
2. ✅ RTMP 支持（可能需要 WebRTC 或其他方案）
3. ✅ 格式降级策略

### 阶段五：优化和测试（1-2天）
1. ✅ 性能优化
2. ✅ 错误处理
3. ✅ 兼容性测试
4. ✅ 文档更新

---

## 📝 配置选项扩展

```typescript
interface VideoPlayerOptions {
  // ... 现有选项

  // 流媒体配置
  hls?: {
    enableWorker?: boolean;
    lowLatencyMode?: boolean;
    backBufferLength?: number;
    maxBufferLength?: number;
    maxMaxBufferLength?: number;
    startLevel?: number;
    capLevelToPlayerSize?: boolean;
  };

  dash?: {
    streaming?: {
      delay?: {
        liveDelay?: number;
        liveDelayFragmentCount?: number;
      };
    };
    abr?: {
      autoSwitchBitrate?: {
        video?: boolean;
        audio?: boolean;
      };
    };
  };

  // 格式检测
  autoDetectFormat?: boolean; // 自动检测格式（默认：true）
  fallbackToNative?: boolean; // 不支持时降级到原生（默认：true）

  // 流媒体选项
  live?: boolean; // 是否为直播流
  lowLatency?: boolean; // 低延迟模式
}
```

---

## 🔍 兼容性考虑

### 浏览器支持

| 格式 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| MP4 | ✅ | ✅ | ✅ | ✅ |
| WebM | ✅ | ✅ | ❌ | ✅ |
| HLS (原生) | ❌ | ❌ | ✅ | ❌ |
| HLS (hls.js) | ✅ | ✅ | ✅ | ✅ |
| DASH | ✅ | ✅ | ❌ | ✅ |
| FLV | ✅ | ✅ | ❌ | ✅ |

### 降级策略

1. **HLS**：
   - 优先使用 hls.js
   - Safari 原生支持，可直接使用
   - 不支持时提示用户

2. **DASH**：
   - 使用 dashjs
   - 不支持时提示用户

3. **FLV**：
   - 使用 flv.js
   - 不支持时提示用户

---

## 💡 性能优化建议

### 1. 按需加载
- 只在需要时加载对应的播放器库
- 使用动态导入

### 2. 缓存策略
- 缓存格式检测结果
- 缓存播放器引擎实例

### 3. 资源管理
- 及时销毁不需要的播放器引擎
- 清理事件监听器

### 4. 网络优化
- HLS/DASH 自适应码率
- 预加载策略
- 缓冲管理

---

## 🎯 优先级建议

### 高优先级（必须实现）
1. ✅ **HLS 支持** - 最常用的流媒体格式
2. ✅ **格式自动检测** - 提升用户体验
3. ✅ **播放器引擎抽象** - 架构基础

### 中优先级（建议实现）
1. ✅ **DASH 支持** - 另一个主流流媒体格式
2. ✅ **低延迟优化** - 直播场景需要
3. ✅ **错误处理和降级** - 提升稳定性

### 低优先级（可选实现）
1. ⚠️ **FLV 支持** - 使用较少
2. ⚠️ **RTMP 支持** - 需要特殊处理
3. ⚠️ **DRM 支持** - 商业场景需要

---

## 📚 参考资源

- [HLS.js 文档](https://github.com/video-dev/hls.js/)
- [dash.js 文档](https://github.com/Dash-Industry-Forum/dash.js)
- [flv.js 文档](https://github.com/bilibili/flv.js)
- [HTML5 Video 格式支持](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)

---

## ✅ 总结

通过集成第三方库（hls.js, dashjs, flv.js）和实现播放器引擎抽象，可以：

1. **支持更多格式**：HLS, DASH, FLV, RTMP
2. **支持流媒体**：直播、自适应码率
3. **自动适配**：格式检测和引擎选择
4. **向后兼容**：保持现有 API 不变

**预计工作量**：5-10 天
**代码增加量**：~1000-1500 行
**依赖增加**：3 个 npm 包（可选）
