const fs = require("fs/promises");
const path = require("path");

// 远程文本地址
const URL = process.env.LINK || "https://raw.githubusercontent.com/Alvin9999-newpac/fanqiang/refs/heads/main/cloudflare%E4%BC%98%E9%80%89ip";

// 本地保存位置
const OUTPUT = path.join(__dirname, "../data/sub.txt");

async function main() {
  console.log("开始获取远程内容...");
  console.log(`URL: ${URL}`);

  // 获取远程文件
  const response = await fetch(URL, {
    // 10 秒超时
    signal: AbortSignal.timeout(10000),
  });

  // 检查 HTTP 状态
  if (!response.ok) {
    throw new Error(
      `获取失败: HTTP ${response.status} ${response.statusText}`
    );
  }

  // 获取文本
  const text = await response.text();

  console.log(`获取成功，共 ${text.length} 个字符`);

  // 确保 data 目录存在
  await fs.mkdir(path.dirname(OUTPUT), {
    recursive: true,
  });

  // 写入 sub.txt
  await fs.writeFile(OUTPUT, text, "utf8");

  console.log(`更新成功: ${OUTPUT}`);
}

main().catch((error) => {
  console.error("执行失败:");
  console.error(error);

  // 告诉 GitHub Actions 本次执行失败
  process.exit(1);
});
