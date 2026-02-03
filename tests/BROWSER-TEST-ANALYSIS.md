# 浏览器测试卡住/超时原因分析

## 现象

运行 `deno test -A tests/browser.test.ts` 时，第一个用例运行超过 1 分钟后超时失败；**browserMode 设为 true 或 false 都会卡住**。

## 可能卡住的阶段（@dreamer/test 流程）

1. **Puppeteer 启动**：`puppeteer.launch()` — Chrome 未找到或启动卡住
2. **打包**：`buildClientBundle(entryPoint)` — 解析/打包入口及依赖时卡住
3. **加载页面**：`page.goto(..., waitUntil: "networkidle0")` — 网络/脚本未 idle，一直等
4. **等待“加载完成”**：`page.waitForFunction(..., window.testReady)` — 脚本未执行完或未设置 testReady，等到超时

## 为何 true/false 都卡住？

- **browserMode: true**：输出 ESM + external，浏览器无法解析 jsr:/npm: → 脚本永远加载不完 → 阶段 4 超时。
- **browserMode: false**：若仍然卡住，说明问题更可能出在：
  - **阶段 2（打包）**：入口 `tests/browser-entry.ts` → `../src/mod.ts` → player + engines + utils，engines 依赖 **hls.js、dashjs、flv.js**（npm）。@dreamer/esbuild 在解析/打包这些 npm 时可能卡住或极慢（Deno 下 npm 解析、node_modules 等）。
  - **阶段 3**：bundle 很大或脚本执行报错，`networkidle0` 迟迟不满足。
  - **阶段 4**：bundle 执行报错，未设置 `window.testReady`，或 runner 等待的全局名/条件不对。

## 如何定位卡在哪一阶段？

1. **先跑“最小入口”**（不引 mod，只设全局 + testReady）：
   - 使用 `tests/browser-entry-minimal.ts` 作为 entryPoint 跑一次浏览器测试。
   - 若**不卡**：说明 runner + 浏览器 + testReady 约定正常，问题在**打包/运行完整 bundle**（阶段 2 或 3/4 因 bundle 报错）。
   - 若**仍卡**：说明问题在**浏览器启动**或 **runner 的 goto/waitFor**（阶段 1 或 3/4 的等待逻辑）。

2. **确认运行目录**：必须在 **video-player 目录** 下执行 `deno test -A tests/browser.test.ts`，这样 `entryPoint: "./tests/browser-entry.ts"` 才会正确解析到本库的 tests。

3. **看超时时间**：若总是在约 90s 后报错，多半是阶段 4（waitForFunction 的 moduleLoadTimeout）；若一直无输出/无报错，更可能是阶段 2（打包卡死）或阶段 1（Chrome 卡死）。

## 已做修复（仍建议保留）

- 使用 **browserMode: false**，避免浏览器端 ESM 解析 jsr:/npm:。
- 在 **browser-entry.ts** 中设置 **testReady = true**，满足 runner 的“加载完成”约定。

若在 **browserMode: false + testReady** 下仍卡，优先怀疑 **打包阶段** 对 npm（hls.js/dashjs/flv.js）的解析或体积导致卡顿/超时，可用 **browser-entry-minimal.ts** 做对比验证。
