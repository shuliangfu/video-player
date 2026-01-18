# 浏览器测试设置指南

## 快速开始

### 1. 安装 Puppeteer

```bash
cd /home/deno/dreamer-jsr/video-player
deno add npm:puppeteer
```

### 2. 安装 Chrome/Chromium

Puppeteer 需要 Chrome/Chromium 浏览器才能运行。有两种方式：

#### 方式 1: 使用系统 Chrome（推荐）

**macOS:**
```bash
brew install --cask google-chrome
```

**Linux:**
```bash
# Ubuntu/Debian
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable
```

**或使用自动安装脚本:**
```bash
./tests/install-chrome.sh
```

#### 方式 2: 使用 Puppeteer 自动下载

```bash
npx puppeteer browsers install chrome
```

### 3. 运行浏览器测试

```bash
deno test --allow-all tests/browser-puppeteer.test.ts
```

## 测试文件说明

### `browser-puppeteer.test.ts`
使用 Puppeteer 在真实浏览器环境中测试视频播放器。

**特点**：
- ✅ 真实浏览器环境
- ✅ 支持所有浏览器 API（全屏、画中画等）
- ✅ 可以测试实际渲染和交互
- ⚠️ 需要安装 Puppeteer
- ⚠️ 测试执行较慢

### `player.test.ts` 和 `integration.test.ts`
使用 Mock DOM 在服务端测试。

**特点**：
- ✅ 快速执行
- ✅ 不需要浏览器
- ⚠️ 某些浏览器 API 无法完全模拟

## 推荐测试策略

1. **单元测试**：使用 Mock DOM（`player.test.ts`）
   - 快速验证逻辑
   - 测试 API 接口
   - 测试数据流

2. **集成测试**：使用 Puppeteer（`browser-puppeteer.test.ts`）
   - 测试浏览器 API
   - 测试实际渲染
   - 测试用户交互

## 当前状态

- ✅ Puppeteer 测试框架已创建
- ✅ 测试用例已编写
- ⚠️ 需要安装 Puppeteer：`deno add npm:puppeteer`
- ⚠️ 需要配置模块导入路径（在测试 HTML 中）

## 下一步

1. 安装 Puppeteer
2. 配置测试 HTML 页面，正确导入 VideoPlayer 模块
3. 运行测试验证功能

## 注意事项

- Puppeteer 需要下载 Chromium，首次运行可能较慢
- 确保有足够的权限运行浏览器
- 某些测试可能需要网络连接（如果测试真实视频源）
