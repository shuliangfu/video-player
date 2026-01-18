/**
 * @fileoverview 播放器引擎测试
 */

import { beforeEach, describe, expect, it } from "@dreamer/test";
import { PlayerEngineFactory } from "../src/engines/factory.ts";
import { VideoFormat } from "../src/utils/format-detector.ts";

// Mock DOM
function setupMockDOM() {
  if (typeof document === "undefined") {
    (globalThis as any).document = {
      createElement: (tag: string) => {
        const element: any = {
          tagName: tag.toUpperCase(),
          style: {},
          addEventListener: () => {},
          removeEventListener: () => {},
          load: () => {},
          play: async () => {},
          pause: () => {},
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
        }

        return element;
      },
    };
  }
}

describe("PlayerEngineFactory", () => {
  beforeEach(() => {
    setupMockDOM();
  });

  it("应该创建原生引擎", () => {
    if (typeof document === "undefined") {
      return;
    }

    const video = document.createElement("video");
    const engine = PlayerEngineFactory.create(video, "https://example.com/video.mp4", {
      autoDetectFormat: true,
    });

    expect(engine).toBeDefined();
    expect(typeof engine.load).toBe("function");
    expect(typeof engine.play).toBe("function");
    expect(typeof engine.pause).toBe("function");
  });

  it("应该根据格式创建对应引擎", () => {
    if (typeof document === "undefined") {
      return;
    }

    const video = document.createElement("video");

    // MP4 应该使用原生引擎
    const mp4Engine = PlayerEngineFactory.create(
      video,
      "https://example.com/video.mp4",
    );
    expect(mp4Engine).toBeDefined();

    // HLS 应该尝试使用 HLS 引擎（如果可用）
    const hlsEngine = PlayerEngineFactory.create(
      video,
      "https://example.com/video.m3u8",
    );
    expect(hlsEngine).toBeDefined();

    // DASH 应该尝试使用 DASH 引擎（如果可用）
    const dashEngine = PlayerEngineFactory.create(
      video,
      "https://example.com/video.mpd",
    );
    expect(dashEngine).toBeDefined();
  });

  it("应该在引擎创建失败时降级到原生", () => {
    if (typeof document === "undefined") {
      return;
    }

    const video = document.createElement("video");
    const engine = PlayerEngineFactory.create(video, "https://example.com/video.m3u8", {
      fallbackToNative: true,
    });

    expect(engine).toBeDefined();
  });

  it("应该支持禁用自动格式检测", () => {
    if (typeof document === "undefined") {
      return;
    }

    const video = document.createElement("video");
    const engine = PlayerEngineFactory.create(video, "https://example.com/video.mp4", {
      autoDetectFormat: false,
    });

    expect(engine).toBeDefined();
  });
});
