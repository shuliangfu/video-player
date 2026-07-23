# @dreamer/video-player

> 📖 English | [中文文档](./docs/zh-CN/README.md)

> A video player package supporting multiple formats and streaming protocols,
> with automatic format detection and the best playback engine selection.

[![JSR](https://jsr.io/badges/@dreamer/video-player)](https://jsr.io/@dreamer/video-player)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-94%20passed%20(3%20runtimes)-brightgreen)](./docs/en-US/TEST_REPORT.md)

---

## Features

Video player supporting MP4, WebM, OGG and streaming protocols (HLS, DASH, FLV,
RTMP). Auto format detection and engine selection (native, HLS.js, DASH.js,
FLV.js). Adaptive bitrate, low- latency live, picture-in-picture, screenshot.
Compatible with **Deno**, **Bun**, **Node.js 22+**, and browsers.

---

## Installation

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

> The `src/` is zero-dependency: it uses only browser globals
> (`document`/`window`/`HTMLVideoElement`) guarded inside class methods, so the
> module loads headless in Node.js for SSR/import. Instantiation requires a
> browser (or a mocked DOM). The npm engines (`hls.js`/`dashjs`/`flv.js`) are
> loaded via the `window.Hls`/`flvjs` globals in a browser, not imported in
> `src/`, so `package.json` ships no runtime dependencies.

---

## Changelog

- **[1.1.0]** (2026-07-23): **Node.js 22+** compatibility (third runtime). Test
  mocks use `Object.defineProperty` to override Node's read-only `navigator`
  getter and polyfill `globalThis.addEventListener` (Node's `globalThis` is not
  an `EventTarget`). CI is a 9-job matrix (Deno 2.9 / Bun 1.3 / Node 22 ×
  Linux/macOS/Windows) running the 4 unit suites; the Playwright browser test is
  split into the local `test:browser` task. See
  [docs/en-US/CHANGELOG.md](./docs/en-US/CHANGELOG.md).

- **[1.0.0]** (2026-02-20): Initial stable release. VideoPlayer with unified
  API, native/HLS/DASH/FLV, auto format detection, playback history,
  picture-in-picture, fullscreen, screenshot. See
  [docs/en-US/CHANGELOG.md](./docs/en-US/CHANGELOG.md).

---

## Documentation

- **Full documentation (English + 中文)**:
  [docs/zh-CN/README.md](./docs/zh-CN/README.md) — complete line-by-line
  content, API, and examples.
- **Test report (EN)**: [docs/en-US/TEST_REPORT.md](./docs/en-US/TEST_REPORT.md)
- **Test report (中文)**:
  [docs/zh-CN/TEST_REPORT.md](./docs/zh-CN/TEST_REPORT.md)

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE)

---

<div align="center">**Made with ❤️ by Dreamer Team**</div>
