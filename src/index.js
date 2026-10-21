const fs = require("fs/promises");
const path = require("path");

// 远程文本地址（包含多个链接的文本源）
const LINK = process.env.LINK;

// 本地保存位置
const OUTPUT = path.join(__dirname, "../data/sub.txt");

async function main() {
  if (!LINK) {
    console.error("错误: 未配置 LINK 环境变量");
    process.exit(1);
  }

  console.log("开始获取远程链接列表...");
  let listResponse;
  try {
    listResponse = await fetch(LINK, {
      signal: AbortSignal.timeout(10000),
    });
    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status} ${listResponse.statusText}`);
    }
  } catch (error) {
    console.error("获取远程链接列表失败:", error.message);
    process.exit(1);
  }

  const listText = await listResponse.text();
  
  // 1. 提取并使用 Set 自动去重，过滤空行
  const urls = [...new Set(listText.split(/[\s,]+/).filter(Boolean))];

  if (urls.length === 0) {
    console.log("未解析到任何有效的链接");
    return;
  }

  console.log(`成功解析到 ${urls.length} 个唯一链接，开始并发获取内容...`);

  // 2. 使用 Promise.allSettled 并发请求，防止单点故障导致整体崩溃
  const results = await Promise.allSettled(
    urls.map(async (url, index) => {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        console.log(`[${index + 1}/${urls.length}] 获取成功 (${text.length} 字符)`);
        return text;
      } catch (err) {
        console.warn(`[${index + 1}/${urls.length}] 获取失败 (${url}): ${err.message}`);
        return null; // 失败返回 null，不中断其他请求
      }
    })
  );

  // 3. 筛选出成功获取的内容并拼接
  const validContents = results
    .filter((res) => res.status === "fulfilled" && res.value !== null)
    .map((res) => res.value);

  if (validContents.length === 0) {
    throw new Error("所有远程内容获取均失败");
  }

  const combinedText = validContents.join("\n\n");

  // 确保 data 目录存在
  await fs.mkdir(path.dirname(OUTPUT), {
    recursive: true,
  });

  // 写入 sub.txt
  await fs.writeFile(OUTPUT, combinedText, "utf8");

  console.log(`更新成功: ${OUTPUT} (成功合并 ${validContents.length}/${urls.length} 个源)`);
}

main().catch((error) => {
  console.error("执行失败:");
  console.error(error);
  process.exit(1);
});