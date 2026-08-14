import { z } from "zod";

/**
 * 银豹 POSPAL 开放 API 数据类型。
 * 依据 docs/12-pospal-integration.md §2 探索结论,字段保持宽松解析
 * (passthrough),真实响应形态以 scripts/pospal-verify.ts 的输出为准。
 */

/** 失败响应:{status:"error", errorCode, messages} */
export const pospalErrorSchema = z.object({
  status: z.literal("error"),
  errorCode: z.number(),
  messages: z.array(z.string()).optional(),
});
export type PospalErrorBody = z.infer<typeof pospalErrorSchema>;

/** 成功响应:{status:"success", errorCode:0, result} */
export const pospalSuccessSchema = z.object({
  status: z.literal("success"),
  errorCode: z.number(),
  result: z.unknown(),
});

/** 分页公共结构:list / hasMore / nextLastId */
const pageResultBase = {
  hasMore: z.boolean(),
  // 实测银豹把大整数序列化为字符串(如 "6060654");number 输入也兼容
  nextLastId: z.coerce.string().nullable().optional(),
};

/** 门店(user/page) */
export const pospalUserSchema = z
  .object({
    userId: z.string(),
    account: z.string(),
    number: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    tel: z.string().optional(),
    company: z.string().optional(),
    industry: z.string().optional(),
    secondIndustry: z.string().optional(),
    createdDatetime: z.string().optional(),
    enable: z.number().optional(),
    self: z.boolean().optional(),
  })
  .passthrough();
export type PospalUser = z.infer<typeof pospalUserSchema>;

export const userPageResultSchema = z.object({
  ...pageResultBase,
  list: z.array(pospalUserSchema),
});
export type UserPageResult = z.infer<typeof userPageResultSchema>;

/** 商品(product/increment-page) */
export const pospalProductSchema = z
  .object({
    uid: z.union([z.string(), z.number()]),
    barcode: z.string().nullable().optional(),
    name: z.string().optional(),
    sellPrice: z.number().nullable().optional(),
  })
  .passthrough();
export type PospalProduct = z.infer<typeof pospalProductSchema>;

export const productPageResultSchema = z.object({
  ...pageResultBase,
  list: z.array(pospalProductSchema),
});
export type ProductPageResult = z.infer<typeof productPageResultSchema>;
