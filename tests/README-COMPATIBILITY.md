# 跨运行时兼容性测试

## 概述

本测试套件使用 `@dreamer/runtime-adapter` 来确保视频播放器在 Deno 和 Bun 环境下都能正常工作。

## 运行时检测

测试使用 `runtime-adapter` 自动检测当前运行时环境：

```typescript
import { detectRuntime, IS_DENO, IS_BUN, RUNTIME } from "@dreamer/runtime-adapter";

const runtime = detectRuntime(); // "deno" | "bun" | "unknown"
```

## 兼容性特性

### 1. 文件系统操作

使用 `runtime-adapter` 的文件系统 API 来检查 Chrome 路径：

```typescript
import { existsSync, statSync } from "@dreamer/runtime-adapter";

if (existsSync(chromePath)) {
  const stat = statSync(chromePath);
  // ...
}
```

### 2. 运行时特定行为

根据运行时环境调整行为：

- **Deno**: 使用 `npm:puppeteer` 导入
- **Bun**: 使用 `npm:puppeteer` 导入（Bun 兼容 npm 包）

### 3. 错误处理

根据运行时环境提供不同的错误提示：

```typescript
if (IS_DENO) {
  console.warn("Deno 环境: ...");
} else if (IS_BUN) {
  console.warn("Bun 环境: ...");
}
```

## 运行测试

### Deno 环境

```bash
deno test --allow-all tests/browser-puppeteer.test.ts
```

### Bun 环境

```bash
bun test tests/browser-puppeteer.test.ts
```

## 测试覆盖

- ✅ 运行时自动检测
- ✅ 跨运行时文件系统操作
- ✅ 运行时特定的错误处理
- ✅ 浏览器环境测试（Puppeteer）

## 注意事项

1. **Chrome 安装**: 两个运行时都需要安装 Chrome/Chromium
2. **权限**: Deno 需要 `--allow-all` 标志
3. **依赖**: 两个运行时都使用 `npm:puppeteer`
