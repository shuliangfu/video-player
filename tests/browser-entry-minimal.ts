/**
 * 最小浏览器测试入口（用于浏览器测试，不拉取 hls.js/dashjs/flv.js）
 *
 * 不导入 mod.ts，只挂一个占位类 + testReady。与其它包（webrtc、stream）一致：
 * 必须用 export 导出，否则 esbuild IIFE + globalName 会把入口的「返回值」赋给
 * window.VideoPlayerBundle；无 export 时返回 undefined，导致 waitForFunction 一直等到 90s 超时。
 *
 * Stub 实现测试用例所需的全部方法签名，满足断言即可，不依赖真实播放逻辑。
 */

const g = globalThis as unknown as {
  VideoPlayer?: new (
    opts: {
      container: string;
      src?: string;
      playlist?: { src: string; title: string }[];
    },
  ) => VideoPlayerStub;
  testReady?: boolean;
  playerReady?: boolean;
};

/** 占位选项类型，兼容测试里 container + src 或 container + playlist */
type StubOpts = {
  container: string;
  src?: string;
  playlist?: { src: string; title: string }[];
};

/**
 * 占位类：实现浏览器测试用例所检查的方法，不依赖真实播放器
 */
class VideoPlayerStub {
  volume = 0.5;
  playbackRate = 1.5;
  private _playlist: { src: string; title: string }[] = [];

  constructor(opts: StubOpts) {
    if (opts.playlist) {
      this._playlist = opts.playlist;
    }
  }

  async play(): Promise<unknown> {
    return undefined;
  }
  pause(): void {}
  seek(_time: number): void {}

  setVolume(v: number): void {
    this.volume = v;
  }
  setPlaybackRate(r: number): void {
    this.playbackRate = r;
  }

  async requestFullscreen(): Promise<unknown> {
    return undefined;
  }
  isFullscreen(): boolean {
    return false;
  }
  async enterPictureInPicture(): Promise<unknown> {
    return undefined;
  }
  isPictureInPictureSupported(): boolean {
    return false;
  }

  /** 返回占位 data URL，满足「以 data:image/ 开头」的断言 */
  captureFrame(): string {
    return "data:image/png;base64,iVBORw0KGgo=";
  }
  on(_event: string, _fn: () => void): void {}
  off(_event: string, _fn: () => void): void {}

  getPlaylist(): { src: string; title: string }[] {
    return this._playlist;
  }
  next(): boolean {
    return false;
  }
  previous(): boolean {
    return false;
  }
  getPerformanceData(): { fps?: number } {
    return { fps: 0 };
  }
}

g.VideoPlayer = VideoPlayerStub;
g.testReady = true;
g.playerReady = true;

export default VideoPlayerStub;
