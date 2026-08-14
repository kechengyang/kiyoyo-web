import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  pospalErrorSchema,
  pospalSuccessSchema,
  productPageResultSchema,
  userPageResultSchema,
  type ProductPageResult,
  type UserPageResult,
} from "./types.js";

/**
 * 银豹 POSPAL 开放 API 客户端。
 * 配置显式传入,不读 process.env —— 与应用的配置加载解耦,
 * 测试与 scripts 可直接构造,服务端由 api/src/config.ts 接线。
 */

export type PospalClientConfig = {
  /** 如 https://area81-win.pospal.cn:443(尾斜杠可省略) */
  baseUrl: string;
  appId: string;
  appKey: string;
  /** 请求超时,默认 10s */
  timeoutMs?: number;
};

export type PospalClient = ReturnType<typeof createPospalClient>;

/**
 * 签名:X-Sign = MD5(appId|requestId|timestamp|appKey).toUpperCase()
 * 文档:docs/12-pospal-integration.md §2.1
 */
export function signRequest(appId: string, requestId: string, timestamp: number, appKey: string) {
  const stringToSign = `${appId}|${requestId}|${timestamp}|${appKey}`;
  return createHash("md5").update(stringToSign).digest("hex").toUpperCase();
}

export class PospalError extends Error {
  /** 银豹业务错误码;网络层错误为 null */
  readonly errorCode: number | null;
  readonly messages: string[];
  /** 瞬时错误(网络/超时/5xx/4003/5000/5001)可重试;其余为配置或业务错误 */
  readonly retryable: boolean;

  constructor(errorCode: number | null, messages: string[], retryable: boolean) {
    super(messages.join("; ") || (errorCode != null ? `POSPAL error ${errorCode}` : "POSPAL request failed"));
    this.name = "PospalError";
    this.errorCode = errorCode;
    this.messages = messages;
    this.retryable = retryable;
  }
}

const API_BASE_PATH = "/openapi/v3";

export function createPospalClient(config: PospalClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? 10_000;

  async function request<T extends z.ZodType>(path: string, body: unknown, resultSchema: T): Promise<z.infer<T>> {
    const requestId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "X-App-Id": config.appId,
          "X-Timestamp": String(timestamp),
          "X-Request-Id": requestId,
          "X-Sign": signRequest(config.appId, requestId, timestamp, config.appKey),
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new PospalError(null, [`network error: ${error instanceof Error ? error.message : String(error)}`], true);
    }

    const json = (await response.json().catch(() => null)) as unknown;
    if (json === null || typeof json !== "object") {
      throw new PospalError(null, [`non-JSON response, HTTP ${response.status}`], response.status >= 500);
    }

    const success = pospalSuccessSchema.safeParse(json);
    if (success.success) return resultSchema.parse(success.data.result);

    const error = pospalErrorSchema.safeParse(json);
    if (error.success) {
      const { errorCode, messages } = error.data;
      const retryable = response.status >= 500 || [4003, 5000, 5001].includes(errorCode);
      throw new PospalError(errorCode, messages ?? [], retryable);
    }

    throw new PospalError(null, [`unrecognized response, HTTP ${response.status}`], response.status >= 500);
  }

  return {
    /** 通用请求(后续推单等接口复用) */
    request,
    /** 查询门店(连锁:传总部 account 返回总部 + 全部子门店) */
    getUserPage(input: { account: string; lastId?: string | number }): Promise<UserPageResult> {
      return request(`${API_BASE_PATH}/user/page`, { account: input.account, ...(input.lastId != null && { lastId: input.lastId }) }, userPageResultSchema);
    },
    /** 查询商品(游标分页;lastId 为上次响应的 nextLastId,字符串与数字均可) */
    getProductPage(input: { account: string; lastId?: string | number }): Promise<ProductPageResult> {
      return request(`${API_BASE_PATH}/product/increment-page`, { account: input.account, ...(input.lastId != null && { lastId: input.lastId }) }, productPageResultSchema);
    },
  };
}
