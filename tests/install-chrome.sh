#!/bin/bash
# 安装 Chrome/Chromium 用于 Puppeteer 测试

echo "安装 Chrome/Chromium 用于 Puppeteer 测试..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  echo "检测到 macOS"
  if command -v brew &> /dev/null; then
    echo "使用 Homebrew 安装 Chrome..."
    brew install --cask google-chrome
  else
    echo "未找到 Homebrew，请手动安装 Chrome:"
    echo "  1. 访问 https://www.google.com/chrome/"
    echo "  2. 下载并安装 Chrome"
  fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  echo "检测到 Linux"
  if command -v apt-get &> /dev/null; then
    echo "使用 apt-get 安装 Chrome..."
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable
  elif command -v yum &> /dev/null; then
    echo "使用 yum 安装 Chrome..."
    sudo yum install -y google-chrome-stable
  else
    echo "请手动安装 Chrome:"
    echo "  访问 https://www.google.com/chrome/"
  fi
else
  echo "不支持的操作系统: $OSTYPE"
  echo "请手动安装 Chrome/Chromium"
fi

echo ""
echo "或者使用 Puppeteer 自动下载 Chrome:"
echo "  npx puppeteer browsers install chrome"
