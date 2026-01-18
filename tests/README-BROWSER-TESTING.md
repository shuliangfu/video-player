# 浏览器端测试指南

## 概述

视频播放器需要在真实的浏览器环境中进行测试，因为许多功能（如全屏、画中画、截图等）依赖浏览器 API。

## 测试方式

### 1. 使用 Puppeteer（推荐）

Puppeteer 可以启动无头浏览器并执行测试。

#### 安装

```bash
deno add npm:puppeteer
```

#### 运行测试

```bash
deno test --allow-all tests/browser-puppeteer.test.ts
```

#### 测试文件

- `tests/browser-puppeteer.test.ts` - Puppeteer 测试套件

### 2. 使用 Playwright

Playwright 是另一个流行的浏览器自动化工具。

#### 安装

```bash
deno add npm:playwright
```

#### 使用示例

```typescript
import { chromium } from "npm:playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:8000/test.html');
// 执行测试...
await browser.close();
```

### 3. 手动浏览器测试

在浏览器中打开 `tests/data/fixtures/test-page.html` 并手动测试功能。

## 测试覆盖

浏览器测试应该覆盖：

- ✅ 播放器创建和初始化
- ✅ 播放控制（播放、暂停、跳转）
- ✅ 音量控制
- ✅ 全屏功能
- ✅ 画中画功能
- ✅ 截图功能
- ✅ 事件系统
- ✅ 播放列表功能
- ✅ 性能监控
- ✅ 键盘快捷键
- ✅ 调试面板
- ✅ 字幕功能

## 注意事项

1. **环境要求**：需要安装 Chrome/Chromium
2. **性能**：浏览器测试比单元测试慢
3. **隔离**：每个测试应该使用独立的浏览器实例
4. **清理**：测试后要关闭浏览器和页面

## 当前状态

- ✅ 测试框架已创建
- ⚠️ 需要安装 Puppeteer 依赖
- ⚠️ 需要配置测试 HTML 页面
- ⚠️ 需要配置模块导入路径

## 下一步

1. 安装 Puppeteer：`deno add npm:puppeteer`
2. 配置测试页面，正确导入 VideoPlayer
3. 运行测试：`deno test --allow-all tests/browser-puppeteer.test.ts`
