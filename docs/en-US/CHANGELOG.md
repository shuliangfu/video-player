# Changelog

All notable changes to @dreamer/video-player are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-07-23

### Added

- **Node.js 22+ compatibility**: Third supported runtime, alongside Deno and
  Bun. The package now ships a `package.json` (zero runtime dependencies —
  `src/` is dependency-free), a `tsconfig.json`, and a `test:node` task
  (`tsx --test --test-force-exit`) so the unit suite runs under Node 22.
- **`@dreamer/test` is Node-compatible**: unit tests run via
  `@dreamer/test` across all three runtimes.
- **`.npmrc`** with `@jsr:registry=https://npm.jsr.io` so `npm`/`bun` resolve
  the `npm:@jsr/dreamer__*` aliases.

### Changed

- **Test mocks hardened for Node**: `navigator` is now installed via
  `Object.defineProperty` (Node 22+ exposes `navigator` as a read-only getter,
  so direct assignment throws in strict mode). `globalThis.addEventListener`/
  `removeEventListener` are polyfilled in `setupMockDOM` because Node's
  `globalThis` is not an `EventTarget` (the player wires `online`/`offline`
  listeners on `globalThis`).
- **No `src/` changes needed**: all browser globals (`document`/`window`/
  `HTMLVideoElement`) are guarded inside class methods, so the module imports
  headless in Node. Timer fields keep their original `number` type with
  `as unknown as number` casts (Deno's Node-compat globals make
  `ReturnType<typeof setTimeout>` resolve to `Timeout`, conflicting with the
  call-site `number`).
- **Upgraded dependencies**: `@dreamer/runtime-adapter` → `^1.2.2`,
  `@dreamer/logger` → `^1.1.0`, `@dreamer/test` → `^1.2.3`.
- **`package.json` runtime deps removed**: `hls.js`/`dashjs`/`flv.js` are kept
  in `deno.json` imports (for the local browser test) but removed from
  `package.json` dependencies — `src/` loads them via `window.Hls`/`flvjs`
  globals, never imports them.
- **`minimumDependencyAge: 0`** added to `deno.json`.

### CI

- 9-job matrix (Deno 2.9 / Bun 1.3 / Node 22 × Linux/macOS/Windows) running
  the 4 unit suites (`engines`, `player`, `integration`, `utils`). No Chromium
  install. The Playwright browser test (`tests/browser.test.ts`) is split into
  the local `test:browser` task and excluded from CI.

### Tests

- **3-runtime unit suite**: Deno 98 passed (94 unit + 4 lifecycle hooks) /
  Bun 94 passed / Node 94 passed — 100% pass rate.

### Compatibility

- **Deno**: 2.6+
- **Bun**: 1.3+
- **Node.js**: 22+ (since v1.1.0)
- **Browsers**: Modern browsers with ES2020 support and required codec/API
  support per format.

---

## [1.0.0] - 2026-02-20

### Added

- **Initial stable release**: First official 1.0.0 release with a stable public
  API.

- **Video player core (`VideoPlayer`)**:
  - Single unified API for all supported formats and streaming protocols.
  - Constructor options: `container`, `src`, `playlist`, `autoDetectFormat`,
    `fallbackToNative`, and engine-specific options (`hls`, `dash`, `flv`).
  - Playback control: `play()`, `pause()`, `seek(time)`, `setVolume(volume)`,
    `setPlaybackRate(rate)`.
  - Playlist support: `getPlaylist()`, `next()`, `previous()`, and optional
    `playlist` in options.
  - Event system: `on(event, callback)`, `off(event, callback)` for `play`,
    `pause`, `ended`, `timeupdate`, `error`, `qualitychange`, and more.
  - State and stats: `getState()`, `getPlaybackStats()`, `getPerformanceData()`.

- **Format and engine support**:
  - **Native formats**: MP4, WebM, OGG via the browser’s native `<video>`
    element.
  - **HLS**: `.m3u8` via HLS.js with optional low-latency mode, worker, and
    buffer tuning.
  - **DASH**: `.mpd` via DASH.js with adaptive bitrate.
  - **FLV**: `.flv` via FLV.js for HTTP-FLV streaming.
  - **Auto format detection**: `detectVideoFormat(url)` and engine selection
    (native, HLS.js, DASH.js, FLV.js) with optional fallback to native.

- **Engines (exported for advanced use)**:
  - `NativePlayerEngine`, `HLSPlayerEngine`, `DASHPlayerEngine`,
    `FLVPlayerEngine`, `BasePlayerEngine`.
  - `PlayerEngineFactory` for creating the appropriate engine by format.

- **Streaming and quality**:
  - Adaptive bitrate (HLS/DASH).
  - Low-latency HLS options.
  - Quality levels: `getQualityLevels()`, `setQuality(level)` where supported.
  - Buffering status and network info hooks.

- **Advanced features**:
  - Picture-in-picture: `requestPictureInPicture()`, `exitPictureInPicture()`,
    `isPictureInPictureSupported()`.
  - Fullscreen: `requestFullscreen()`, `exitFullscreen()`, `isFullscreen()`.
  - Screenshot: `captureFrame()` returning a data URL.
  - Playback history (resume): `enablePlaybackHistory`, `getPlaybackHistory()`,
    `clearPlaybackHistory()`.
  - Settings persistence: `saveSettings`, `getPlayerSettings()`,
    `clearPlayerSettings()` (volume, playbackRate, muted).
  - Subtitle support: subtitle tracks and style options.
  - Keyboard shortcuts (optional).
  - Video download with progress where supported.
  - Debug panel option for development.

- **Utilities**:
  - `StorageManager`: `savePlaybackHistory()`, `getPlaybackHistory()`,
    `getPlaybackPosition()`, `clearPlaybackHistory()`, `savePlayerSettings()`,
    `getPlayerSettings()`, `clearPlayerSettings()`.
  - Format detection: `detectVideoFormat()`, `getRecommendedFormats()`,
    `VideoFormat` enum, `isSafari()`, `isIOSSafari()`, `isAV1Supported()`,
    `isSafariAV1Supported()`.

- **Types and exports**:
  - Types: `VideoPlayerOptions`, `PlayerEvent`, `PlayerState`, `PlaybackStats`,
    `PlaylistItem`, `QualityLevel`, `HLSConfig`, `DASHConfig`, `FLVConfig`,
    `PlaybackHistory`, `PlayerSettings`, `SubtitleTrack`, `SubtitleStyle`, and
    related interfaces.

- **Package exports**:
  - Main: `@dreamer/video-player` (or `jsr:@dreamer/video-player`) — re-exports
    player, engines, utils, and types.
  - Subpath: `@dreamer/video-player/player` — `VideoPlayer` class only.

- **Runtime and environment**:
  - Compatible with **Deno** 2.6+, **Bun** 1.3.5+, and modern **browsers**
    (Chrome, Firefox, Safari, Edge).
  - Uses `@dreamer/runtime-adapter` for portable file/env/path usage in tests;
    optional peer: `@dreamer/logger`, `@dreamer/test` for tests.
  - Optional npm deps (loaded when needed): `hls.js`, `dashjs`, `flv.js`.

### Compatibility

- **Deno**: 2.6+
- **Bun**: 1.3.5+
- **Browsers**: Modern browsers with ES2020 support and required codec/API
  support per format.
