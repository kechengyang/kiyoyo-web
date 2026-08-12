import { z } from "zod";

export const bootstrapSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  locale: z.enum(["en", "zh"]).default("en"),
});
