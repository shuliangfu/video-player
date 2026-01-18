/**
 * @module @dreamer/video-player/utils/format-detector
 *
 * @fileoverview 视频格式检测工具
 *
 * 自动检测视频源格式，用于选择合适的播放器引擎。
 * 提供格式检测、浏览器兼容性检测等功能。
 *
 * 主要功能：
 * - 视频格式自动检测
 * - 浏览器兼容性检测
 * - 格式推荐
 * - AV1 支持检测
 *
 * @example
 * ```typescript
 * import { detectVideoFormat, VideoFormat } from "jsr:@dreamer/video-player/utils/format-detector";
 *
 * const format = detectVideoFormat("https://example.com/video.m3u8");
 * if (format === VideoFormat.HLS) {
 *   // 使用 HLS 引擎
 * }
 * ```
 */

/**
 * 视频格式枚举
 */
export enum VideoFormat {
  /** MP4 格式 */
  MP4 = "mp4",
  /** WebM 格式 */
  WEBM = "webm",
  /** OGG 格式 */
  OGG = "ogg",
  /** AV1 格式（MP4 或 WebM 容器） */
  AV1 = "av1",
  /** HLS 流媒体 (.m3u8) */
  HLS = "hls",
  /** DASH 流媒体 (.mpd) */
  DASH = "dash",
  /** FLV 格式 (.flv) */
  FLV = "flv",
  /** RTMP 流媒体协议 */
  RTMP = "rtmp",
  /** 未知格式 */
  UNKNOWN = "unknown",
}

/**
 * 检测视频格式
 *
 * 根据 URL 的协议、扩展名和内容类型自动检测视频格式
 *
 * @param src - 视频源 URL
 * @returns 检测到的视频格式
 *
 * @example
 * ```typescript
 * const format = detectVideoFormat("https://example.com/video.m3u8");
 * // 返回: VideoFormat.HLS
 * ```
 */
export function detectVideoFormat(src: string): VideoFormat {
  if (!src) {
    return VideoFormat.UNKNOWN;
  }

  // RTMP 协议检测（RTMP 无法在浏览器直接播放，需要转换为 HTTP-FLV）
  if (src.startsWith("rtmp://") || src.startsWith("rtmps://")) {
    // 尝试检测是否有对应的 HTTP-FLV URL
    // 例如：rtmp://example.com/live/stream -> http://example.com/live/stream.flv
    return VideoFormat.RTMP;
  }

  // HTTP-FLV 流检测（用于 RTMP 转 HTTP-FLV）
  if (
    src.includes("/flv") && (src.includes("live") || src.includes("stream"))
  ) {
    // 可能是 HTTP-FLV 流
    const url = new URL(src);
    if (
      url.pathname.includes("flv") ||
      url.searchParams.has("format") && url.searchParams.get("format") === "flv"
    ) {
      return VideoFormat.FLV;
    }
  }

  try {
    const url = new URL(src);
    const pathname = url.pathname.toLowerCase();
    const extension = pathname.split(".").pop()?.toLowerCase() || "";

    // 根据扩展名检测
    switch (extension) {
      case "m3u8":
        return VideoFormat.HLS;
      case "mpd":
        return VideoFormat.DASH;
      case "flv":
        return VideoFormat.FLV;
      case "mp4":
      case "m4v":
        // 检查是否是 AV1 codec（通过 URL 参数或路径）
        if (
          src.includes("av01") || src.includes("av1") ||
          url.searchParams.get("codec")?.includes("av01")
        ) {
          return VideoFormat.AV1;
        }
        return VideoFormat.MP4;
      case "webm":
        // WebM 可能包含 AV1
        if (
          src.includes("av01") || src.includes("av1") ||
          url.searchParams.get("codec")?.includes("av01")
        ) {
          return VideoFormat.AV1;
        }
        return VideoFormat.WEBM;
      case "ogg":
      case "ogv":
        return VideoFormat.OGG;
    }

    // 根据内容类型检测（如果 URL 包含类型信息）
    const contentType = url.searchParams.get("type")?.toLowerCase();
    if (contentType) {
      if (
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegurl")
      ) {
        return VideoFormat.HLS;
      }
      if (contentType.includes("application/dash+xml")) {
        return VideoFormat.DASH;
      }
      if (contentType.includes("video/flv")) {
        return VideoFormat.FLV;
      }
      // 检测 AV1 codec
      if (contentType.includes("av01") || contentType.includes("av1")) {
        return VideoFormat.AV1;
      }
      if (contentType.includes("video/mp4")) {
        return VideoFormat.MP4;
      }
      if (contentType.includes("video/webm")) {
        return VideoFormat.WEBM;
      }
      if (contentType.includes("video/ogg")) {
        return VideoFormat.OGG;
      }
    }
  } catch {
    // URL 解析失败，尝试简单字符串匹配
    if (src.includes(".m3u8")) {
      return VideoFormat.HLS;
    }
    if (src.includes(".mpd")) {
      return VideoFormat.DASH;
    }
    if (src.includes(".flv")) {
      return VideoFormat.FLV;
    }
  }

  return VideoFormat.UNKNOWN;
}

/**
 * 检查浏览器是否原生支持格式
 *
 * @param format - 视频格式
 * @param video - 视频元素（用于检测）
 * @returns 是否支持
 */
export function isFormatNativelySupported(
  format: VideoFormat,
  video: HTMLVideoElement,
): boolean {
  switch (format) {
    case VideoFormat.MP4:
      return video.canPlayType("video/mp4") !== "";
    case VideoFormat.WEBM:
      return video.canPlayType("video/webm") !== "";
    case VideoFormat.OGG:
      return video.canPlayType("video/ogg") !== "";
    case VideoFormat.AV1:
      // 检测 AV1 支持（MP4 或 WebM 容器）
      return video.canPlayType('video/mp4; codecs="av01.0.05M.08"') !== "" ||
        video.canPlayType('video/webm; codecs="av01"') !== "" ||
        video.canPlayType('video/mp4; codecs="av01.0.08M.10"') !== "";
    case VideoFormat.HLS:
      // Safari 原生支持 HLS
      return video.canPlayType("application/vnd.apple.mpegurl") !== "";
    default:
      return false;
  }
}

/**
 * 获取格式的 MIME 类型
 *
 * @param format - 视频格式
 * @returns MIME 类型字符串
 */
export function getFormatMimeType(format: VideoFormat): string {
  switch (format) {
    case VideoFormat.MP4:
      return "video/mp4";
    case VideoFormat.WEBM:
      return "video/webm";
    case VideoFormat.OGG:
      return "video/ogg";
    case VideoFormat.AV1:
      // AV1 通常使用 MP4 或 WebM 容器
      return 'video/mp4; codecs="av01.0.05M.08"';
    case VideoFormat.HLS:
      return "application/vnd.apple.mpegurl";
    case VideoFormat.DASH:
      return "application/dash+xml";
    case VideoFormat.FLV:
      return "video/flv";
    default:
      return "video/*";
  }
}

/**
 * 检测浏览器是否支持 AV1 格式
 *
 * @param video - 视频元素（用于检测）
 * @returns 是否支持 AV1
 *
 * @example
 * ```typescript
 * const video = document.createElement("video");
 * if (isAV1Supported(video)) {
 *   console.log("浏览器支持 AV1");
 * }
 * ```
 */
export function isAV1Supported(video: HTMLVideoElement): boolean {
  // 检测多种 AV1 codec 字符串
  const av1Codecs = [
    'video/mp4; codecs="av01.0.05M.08"', // MP4 容器，AV1 Main Profile
    'video/mp4; codecs="av01.0.08M.10"', // MP4 容器，AV1 High Profile
    'video/webm; codecs="av01"', // WebM 容器，AV1
    'video/webm; codecs="av01.0.05M.08"', // WebM 容器，AV1 Main Profile
  ];

  return av1Codecs.some((codec) => video.canPlayType(codec) !== "");
}

/**
 * 检测是否为 Safari 浏览器
 *
 * @returns 是否为 Safari
 */
export function isSafari(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome") &&
    !ua.includes("chromium");
}

/**
 * 检测是否为 iOS Safari
 *
 * @returns 是否为 iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && ua.includes("safari") &&
    !ua.includes("chrome");
}

/**
 * 检测 Safari 是否支持 AV1（需要硬件解码）
 *
 * Safari 17+ 在支持 AV1 硬件解码的设备上才支持（A17 Pro, M3, M4 系列芯片）
 *
 * @param video - 视频元素（用于检测）
 * @returns 是否支持 AV1
 */
export function isSafariAV1Supported(video: HTMLVideoElement): boolean {
  if (!isSafari()) {
    return false;
  }

  // Safari 17+ 才支持 AV1
  const safariVersion = getSafariVersion();
  if (safariVersion < 17) {
    return false;
  }

  // 检测 AV1 支持
  return isAV1Supported(video);
}

/**
 * 获取 Safari 版本号
 *
 * @returns Safari 版本号，如果无法检测则返回 0
 */
function getSafariVersion(): number {
  if (typeof navigator === "undefined") {
    return 0;
  }

  const ua = navigator.userAgent;
  const match = ua.match(/Version\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 获取推荐的视频格式（考虑浏览器兼容性）
 *
 * 根据浏览器类型和 AV1 支持情况，推荐最佳的视频格式
 *
 * @param video - 视频元素（用于检测）
 * @returns 推荐的格式列表（按优先级排序）
 *
 * @example
 * ```typescript
 * const video = document.createElement("video");
 * const formats = getRecommendedFormats(video);
 * // 返回: ['av1', 'h264', 'hls'] 等
 * ```
 */
export function getRecommendedFormats(
  video: HTMLVideoElement,
): VideoFormat[] {
  const formats: VideoFormat[] = [];

  // Safari 特殊处理
  if (isSafari()) {
    // Safari 原生支持 HLS
    formats.push(VideoFormat.HLS);

    // Safari 17+ 且支持 AV1 硬件解码
    if (isSafariAV1Supported(video)) {
      formats.push(VideoFormat.AV1);
    }

    // Safari 支持 MP4 (H.264)
    formats.push(VideoFormat.MP4);

    return formats;
  }

  // 其他浏览器：优先 AV1，然后 H.264
  if (isAV1Supported(video)) {
    formats.push(VideoFormat.AV1);
  }

  formats.push(VideoFormat.MP4);
  formats.push(VideoFormat.WEBM);

  // 如果支持 HLS (通过 hls.js)
  formats.push(VideoFormat.HLS);
  formats.push(VideoFormat.DASH);

  return formats;
}
