/**
 * 银豹连通性验证(只读,不写数据库):
 *  1. user/page             —— 门店列表(确认凭据/签名/host 有效)
 *  2. product/increment-page —— 商品字典第一页(打印原始行,确认真实返回字段)
 *
 * 凭据来源:进程环境变量优先,其次根目录 .env(兼容 `KEY=VALUE` 与 `key: value` 两种格式)。
 * 用法:cd api && npm run pospal:verify
 * 安全:本脚本任何输出都不包含 appKey。
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPospalClient } from "../src/pospal/client.js";

/** .env 键名 → POSPAL_* 环境变量映射(兼容根目录 .env 的 YAML 风格键) */
const KEY_ALIASES: Record<string, string> = {
  appID: "POSPAL_APP_ID",
  appKey: "POSPAL_APP_KEY",
  account: "POSPAL_HQ_ACCOUNT",
};

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq > 0) return [trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim()];
  const colon = trimmed.indexOf(":");
  if (colon > 0) return [trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim()];
  return null;
}

async function loadEnvFile(path: string) {
  const content = await readFile(path, "utf8").catch(() => "");
  for (const line of content.split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    const target = KEY_ALIASES[key] ?? key;
    // 注意:根 .env 的"接口地址前缀"是控制台地址(area81-win.pospal.cn),不是开放 API 地址,
    // 开放 API 唯一正式 host 为 https://platform.pospal.cn(见 docs/12-pospal-integration.md §2.1)
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(target) && value) process.env[target] ??= value;
  }
}

async function main() {
  const envFile = process.env.POSPAL_ENV_FILE ?? resolve(process.cwd(), "../.env");
  await loadEnvFile(envFile);

  // 开放 API 唯一正式 host(银豹官方文档),可用 POSPAL_BASE_URL 覆盖
  process.env.POSPAL_BASE_URL ??= "https://platform.pospal.cn";
  const missing = ["POSPAL_APP_ID", "POSPAL_APP_KEY", "POSPAL_HQ_ACCOUNT"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`缺少凭据: ${missing.join(", ")}\n请在根 .env 配置(见 docs/12-pospal-integration.md §10.3),或通过 POSPAL_* 环境变量传入。`);
    process.exit(1);
  }

  const client = createPospalClient({
    baseUrl: process.env.POSPAL_BASE_URL!,
    appId: process.env.POSPAL_APP_ID!,
    appKey: process.env.POSPAL_APP_KEY!,
  });

  console.log(`凭据已从 ${envFile} 加载(appKey 不打印),baseUrl=${process.env.POSPAL_BASE_URL}`);
  console.log("account =", process.env.POSPAL_HQ_ACCOUNT);
  console.log();

  // 1) 门店列表
  const stores = await client.getUserPage({ account: process.env.POSPAL_HQ_ACCOUNT! });
  console.log(`== user/page:共 ${stores.list.length} 家,hasMore=${stores.hasMore} ==`);
  for (const store of stores.list) {
    console.log(
      `  ${store.account.padEnd(24)} | ${String(store.name ?? "").padEnd(20)} | enable=${store.enable ?? "?"} | self=${store.self ?? false} | ${store.address ?? ""}`,
    );
  }
  console.log();

  // 2) 商品字典第一页(原始行,确认真实字段名)
  const products = await client.getProductPage({ account: process.env.POSPAL_HQ_ACCOUNT! });
  console.log(
    `== product/increment-page:第 1 页 ${products.list.length} 条,hasMore=${products.hasMore},nextLastId=${products.nextLastId} ==`,
  );
  for (const product of products.list.slice(0, 5)) {
    console.log("  ", JSON.stringify(product));
  }
}

main().catch((error) => {
  console.error("验证失败:", error instanceof Error ? error.message : error);
  process.exit(1);
});
