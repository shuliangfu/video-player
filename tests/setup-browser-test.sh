#!/bin/bash
# 设置浏览器测试环境

echo "设置浏览器测试环境..."

# 检查 Puppeteer 是否已安装
if ! deno eval "import('npm:puppeteer')" 2>/dev/null; then
  echo "安装 Puppeteer..."
  deno add npm:puppeteer
fi

echo "✅ 浏览器测试环境已就绪"
echo ""
echo "运行浏览器测试："
echo "  deno test --allow-all tests/browser-puppeteer.test.ts"
echo ""
echo "或者运行所有测试（包括浏览器测试）："
echo "  deno test --allow-all tests/"
