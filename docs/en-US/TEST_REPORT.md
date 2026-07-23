# @dreamer/video-player Test Report

> Unit test report for the video player package across three runtimes
> (Deno, Bun, Node.js). The Playwright browser test (`tests/browser.test.ts`)
> is a local-only `test:browser` task and is excluded from CI.

## Test overview

- **Test package**: @dreamer/test (Deno, Bun, and Node.js compatible)
- **Test date**: 2026-07-23
- **Status**: ✅ All passed (3 runtimes)

## Results

| Runtime         | Passed | Failed | Notes                            |
| --------------- | ------ | ------ | -------------------------------- |
| Deno 2.9        | 98     | 0      | 94 unit + 4 lifecycle hooks      |
| Bun 1.3         | 94     | 0      | Unit suite                       |
| Node.js 22      | 94     | 0      | Unit suite (`tsx --test`)        |
| **Total (per runtime)** | **94 unit** | **0** | 100% pass rate           |

### Test files (unit suite, run in CI)

| File                  | Count | Status      |
| --------------------- | ----- | ----------- |
| `player.test.ts`      | 60    | ✅ All pass |
| `integration.test.ts` | 9     | ✅ All pass |
| `engines.test.ts`     | 4     | ✅ All pass |
| `utils.test.ts`       | 21    | ✅ All pass |

> Deno counts the `@dreamer/test cleanup browsers` lifecycle hook as one extra
> test per file (+4), hence 98 vs 94 on Bun/Node.

### Excluded from CI

- `tests/browser.test.ts` — Playwright browser test; runs locally via
  `deno task test:browser`. Requires Chromium and the `hls.js`/`dashjs`/
  `flv.js` engines, so it is not part of the CI unit matrix.

## Node.js compatibility notes

- `navigator` is installed via `Object.defineProperty` (Node 22+ exposes it as a
  read-only getter; direct assignment throws in strict mode).
- `globalThis.addEventListener`/`removeEventListener` are polyfilled in
  `setupMockDOM` (Node's `globalThis` is not an `EventTarget`; the player wires
  `online`/`offline` listeners on `globalThis`).
- `src/` is zero-dependency and guards all browser globals inside class
  methods, so the module imports headless in Node (instantiation needs a
  mocked DOM, which the tests provide).

## CI matrix

9 jobs: Deno 2.9 / Bun 1.3 / Node 22 × Linux / macOS / Windows. Unit suites
only; no Chromium install.

**Report date**: 2026-07-23 · **Unit tests**: 94 · **Pass**: 100% ✅ (3 runtimes)
