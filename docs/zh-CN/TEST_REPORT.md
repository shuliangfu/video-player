# @dreamer/video-player 测试报告

> 视频播放器包三端（Deno、Bun、Node.js）单元测试报告。Playwright 浏览器测试
> （`tests/browser.test.ts`）为本地 `test:browser` 任务，不纳入 CI。

[![Tests](https://img.shields.io/badge/tests-94%20passed%20(3%20runtimes)-brightgreen)](./TEST_REPORT.md)

---

## 📊 测试概览

- **测试包**: @dreamer/test（兼容 Deno、Bun、Node.js）
- **测试时间**: 2026-07-23
- **测试状态**: ✅ 全部通过（三端）

## 测试结果

| 运行时          | 通过   | 失败 | 说明                       |
| --------------- | ------ | ---- | -------------------------- |
| Deno 2.9        | 98     | 0    | 94 单元 + 4 生命周期钩子   |
| Bun 1.3         | 94     | 0    | 单元测试套件               |
| Node.js 22      | 94     | 0    | 单元测试套件（`tsx --test`）|
| **合计（每端）** | **94 单元** | **0** | 通过率 100%          |

### 测试文件（单元测试套件，CI 中运行）

| 测试文件              | 测试数 | 状态        |
| --------------------- | ------ | ----------- |
| `player.test.ts`      | 60     | ✅ 全部通过 |
| `integration.test.ts` | 9      | ✅ 全部通过 |
| `engines.test.ts`     | 4      | ✅ 全部通过 |
| `utils.test.ts`       | 21     | ✅ 全部通过 |

> Deno 会将 `@dreamer/test cleanup browsers` 生命周期钩子计为每文件 +1 个测试
> （共 +4），因此 Deno 为 98，而 Bun/Node 为 94。

### CI 之外

- `tests/browser.test.ts` —— Playwright 浏览器测试，通过 `deno task test:browser`
  本地运行。需要 Chromium 及 `hls.js`/`dashjs`/`flv.js` 引擎，故不纳入 CI 单元矩阵。

## Node.js 兼容性说明

- `navigator` 通过 `Object.defineProperty` 安装（Node 22+ 将其暴露为只读 getter，
  严格模式下直接赋值会抛错）。
- `setupMockDOM` 中补全 `globalThis.addEventListener`/`removeEventListener` polyfill
  （Node 的 `globalThis` 不是 `EventTarget`；播放器在 `globalThis` 上注册
  `online`/`offline` 监听器）。
- `src/` 零依赖，所有浏览器全局变量均在类方法内守卫，因此模块可在 Node 中无头导入
  （实例化需要 mock DOM，由测试提供）。

## CI 矩阵

9 任务：Deno 2.9 / Bun 1.3 / Node 22 × Linux / macOS / Windows。仅单元测试套件，
不安装 Chromium。

**报告日期**: 2026-07-23 · **单元测试**: 94 · **通过率**: 100% ✅（三端）
