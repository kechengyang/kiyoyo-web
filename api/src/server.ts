import { randomUUID } from "node:crypto";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Storage } from "@google-cloud/storage";
import { z, ZodError } from "zod";
import { config } from "./config.js";
import { pool, query } from "./db.js";
import { authenticate, requireAdmin, requireProfile } from "./auth.js";
import { createPickupToken, hashPickupToken, verifyPickupSignature } from "./crypto.js";
import { calculateCouponDiscount, type CouponRow } from "./coupons.js";

const app = Fastify({
  logger: true,
  maxParamLength: 1_000,
  genReqId: (request) =>
    String(request.headers["x-request-id"] ?? randomUUID()),
});
const storage = new Storage({ projectId: config.projectId });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, {
  origin: (origin, callback) => callback(null, !origin || config.allowedOrigins.includes(origin)),
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: { code: "INVALID_ARGUMENT", message: "Request validation failed", request_id: request.id, details: error.issues },
    });
  }
  request.log.error(error);
  return reply.code(500).send({ error: { code: "INTERNAL", message: "Unexpected server error", request_id: request.id } });
});

app.get("/healthz", async () => ({ status: "ok", service: "kiyoyo-commerce-api", environment: config.environment }));
app.get("/health", async () => ({ status: "ok", service: "kiyoyo-commerce-api", environment: config.environment }));
app.get("/readyz", async (_request, reply) => {
  await query("select 1");
  return reply.send({ status: "ready" });
});

app.get("/v1/app-config", async () => ({
  currency: "KES",
  timezone: "Africa/Nairobi",
  payment: { provider: "MOCK", test_tokens: ["test_ok", "test_declined", "test_timeout"] },
  fulfillment: ["PICKUP", "DELIVERY", "SHIPPING"],
  environment: config.environment,
}));

const storeSelect = `select id,code,name,area,address,phone,lat::float,lng::float,timezone,status,pickup_enabled,delivery_enabled,location_verified,opening_hours_json
  from stores where status in ('ACTIVE','COMING_SOON')`;

app.get("/v1/stores", async (request) => {
  const input = z.object({ lat: z.coerce.number().optional(), lng: z.coerce.number().optional() }).parse(request.query);
  const result = await query(`${storeSelect} order by name`);
  const stores = result.rows.map((row: any) => {
    if (input.lat == null || input.lng == null || row.lat == null || row.lng == null) return { ...row, distance_km: null };
    const radius = 6371;
    const dLat = ((row.lat - input.lat) * Math.PI) / 180;
    const dLng = ((row.lng - input.lng) * Math.PI) / 180;
    const value = Math.sin(dLat / 2) ** 2 + Math.cos((input.lat * Math.PI) / 180) * Math.cos((row.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return { ...row, distance_km: Math.round(radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 10) / 10 };
  });
  stores.sort((a: any, b: any) => (a.distance_km ?? Number.POSITIVE_INFINITY) - (b.distance_km ?? Number.POSITIVE_INFINITY));
  return { data: stores };
});

app.get("/v1/stores/:id", async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const result = await query(`${storeSelect} and (id::text=$1 or code=$1)`, [id]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Store not found" } });
  return { data: result.rows[0] };
});

const productSelect = `select p.id,p.external_code,p.kind,p.category_slug,p.slug,p.name_en,p.name_zh,p.description_en,p.description_zh,
  p.image_key,p.base_price,p.size_prices_json,p.discount_percent,round(p.base_price*(100-p.discount_percent)/100.0)::integer as effective_price,
  p.active,p.catalog_version,p.updated_at,t.id as tag_id,t.label as tag_label,t.tone as tag_tone
  from products p left join product_tags t on t.id=p.tag_id and t.active=true`;

const productSlug = (name: string, category: string) => {
  const stem = `${category}-${name}`
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${stem || "product"}-${randomUUID().slice(0, 8)}`;
};

const productWriteSchema = z.object({
  name_en: z.string().trim().min(1).max(160),
  name_zh: z.string().trim().min(1).max(160),
  description_en: z.string().trim().max(2_000).default(""),
  description_zh: z.string().trim().max(2_000).default(""),
  category_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  base_price: z.number().int().min(0),
  discount_percent: z.number().int().min(0).max(90).default(0),
  tag_id: z.string().uuid().nullable().default(null),
});

const assertActiveTag = async (tagId: string | null, reply: FastifyReply) => {
  if (!tagId) return true;
  const tag = await query("select 1 from product_tags where id=$1 and active=true", [tagId]);
  if (tag.rowCount) return true;
  reply.code(422).send({ error: { code: "TAG_INVALID", message: "Choose an active product tag" } });
  return false;
};

const couponSelect = `select c.*,
  case
    when c.status='ARCHIVED' then 'ARCHIVED'
    when c.status='DRAFT' then 'DRAFT'
    when c.status='PAUSED' or not c.redemption_enabled then 'PAUSED'
    when now() < c.starts_at then 'SCHEDULED'
    when now() >= c.ends_at then 'ENDED'
    else 'ACTIVE'
  end as effective_status`;

app.get("/v1/products", async (request) => {
  const input = z.object({ kind: z.enum(["DRINK", "GOODS", "drink", "goods"]).optional(), category: z.string().optional() }).parse(request.query);
  const values: unknown[] = [];
  const where: string[] = ["p.active=true"];
  if (input.kind) { values.push(input.kind.toUpperCase()); where.push(`p.kind=$${values.length}`); }
  if (input.category) { values.push(input.category.toLowerCase()); where.push(`p.category_slug=$${values.length}`); }
  const result = await query(`${productSelect}${where.length ? ` where ${where.join(" and ")}` : ""} order by p.kind,p.category_slug,p.name_en`, values);
  return { data: result.rows };
});

app.get("/v1/products/:slug", async (request, reply) => {
  const { slug } = z.object({ slug: z.string() }).parse(request.params);
  const result = await query(`${productSelect} where p.active=true and (p.slug=$1 or p.id::text=$1 or p.external_code=$1)`, [slug]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Product not found" } });
  return { data: result.rows[0] };
});

app.get("/v1/search", async (request) => {
  const input = z.object({ q: z.string().trim().min(1).max(100) }).parse(request.query);
  const term = `%${input.q}%`;
  const [products, stores] = await Promise.all([
    query(`${productSelect} where p.active=true and (p.name_en ilike $1 or p.name_zh ilike $1 or p.description_en ilike $1 or p.category_slug ilike $1) order by p.name_en limit 24`, [term]),
    query(`${storeSelect} and (name ilike $1 or area ilike $1 or address ilike $1) order by name limit 12`, [term]),
  ]);
  return { data: { products: products.rows, stores: stores.rows } };
});

app.get("/v1/media/:encodedKey", async (request, reply) => {
  const { encodedKey } = z.object({ encodedKey: z.string().min(4).max(1000) }).parse(request.params);
  let objectKey: string;
  try { objectKey = Buffer.from(encodedKey, "base64url").toString("utf8"); } catch { return reply.code(400).send({ error: { code: "INVALID_MEDIA_KEY", message: "Media key is invalid" } }); }
  if (!objectKey.startsWith("products/") || objectKey.includes("..")) return reply.code(400).send({ error: { code: "INVALID_MEDIA_KEY", message: "Media key is invalid" } });
  const file = storage.bucket(config.mediaBucket).file(objectKey);
  const [metadata] = await file.getMetadata().catch(() => [null]);
  if (!metadata) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Media not found" } });
  reply.header("Content-Type", metadata.contentType ?? "application/octet-stream");
  reply.header("Cache-Control", "public,max-age=3600,stale-while-revalidate=86400");
  reply.header("Cross-Origin-Resource-Policy", "cross-origin");
  return reply.send(file.createReadStream());
});

app.post("/v1/auth/bootstrap", { preHandler: authenticate }, async (request) => {
  const input = z.object({ nickname: z.string().trim().min(1).max(80).optional(), locale: z.enum(["en", "zh"]).default("en") }).parse(request.body ?? {});
  const actor = request.actor!;
  const nickname = input.nickname ?? actor.email?.split("@")[0] ?? "KIYOYO Member";
  const result = await query(
    `insert into users(external_auth_id,auth_provider,email,nickname,locale)
     values($1,'identity-platform',$2,$3,$4)
     on conflict(external_auth_id) do update set email=excluded.email,updated_at=now()
     returning id,external_auth_id,email,nickname,gender,birth_year,locale,status,created_at`,
    [actor.authId, actor.email, nickname, input.locale],
  );
  return { data: result.rows[0], permissions: { admin: actor.isAdmin } };
});

app.get("/v1/me", { preHandler: requireProfile }, async (request) => {
  const result = await query("select id,email,nickname,gender,birth_year,locale,status,created_at,updated_at from users where id=$1", [request.actor!.userId]);
  return { data: result.rows[0], permissions: { admin: request.actor!.isAdmin } };
});

app.patch("/v1/me", { preHandler: requireProfile }, async (request) => {
  const input = z.object({ nickname: z.string().trim().min(1).max(80).optional(), gender: z.enum(["FEMALE", "MALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).nullable().optional(), birth_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(), locale: z.enum(["en", "zh"]).optional() }).parse(request.body);
  const result = await query(
    `update users set nickname=coalesce($2,nickname),gender=coalesce($3,gender),birth_year=coalesce($4,birth_year),locale=coalesce($5,locale),updated_at=now()
     where id=$1 returning id,email,nickname,gender,birth_year,locale,status,updated_at`,
    [request.actor!.userId, input.nickname ?? null, input.gender ?? null, input.birth_year ?? null, input.locale ?? null],
  );
  return { data: result.rows[0] };
});

app.get("/v1/me/addresses", { preHandler: requireProfile }, async (request) => {
  const result = await query("select * from addresses where user_id=$1 order by is_default desc,created_at desc", [request.actor!.userId]);
  return { data: result.rows };
});

const addressSchema = z.object({ label: z.string().trim().min(1).max(40), contact_name: z.string().trim().min(1).max(100), phone_e164: z.string().trim().min(7).max(24), line1: z.string().trim().min(3).max(200), area: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(100).default("Nairobi"), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional(), delivery_instructions: z.string().max(300).optional(), make_default: z.boolean().default(false) });

app.post("/v1/me/addresses", { preHandler: requireProfile }, async (request) => {
  const input = addressSchema.parse(request.body);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const count = await client.query("select count(*)::int as count from addresses where user_id=$1", [request.actor!.userId]);
    const makeDefault = input.make_default || count.rows[0].count === 0;
    if (makeDefault) await client.query("update addresses set is_default=false,updated_at=now() where user_id=$1", [request.actor!.userId]);
    const result = await client.query(
      `insert into addresses(user_id,label,contact_name,phone_e164,line1,area,city,lat,lng,delivery_instructions,is_default)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [request.actor!.userId, input.label, input.contact_name, input.phone_e164, input.line1, input.area, input.city, input.lat ?? null, input.lng ?? null, input.delivery_instructions ?? null, makeDefault],
    );
    await client.query("commit");
    return { data: result.rows[0] };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.patch("/v1/me/addresses/:id", { preHandler: requireProfile }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = addressSchema.parse(request.body);
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (input.make_default) await client.query("update addresses set is_default=false,updated_at=now() where user_id=$1", [request.actor!.userId]);
    const result = await client.query(
      `update addresses set label=$3,contact_name=$4,phone_e164=$5,line1=$6,area=$7,city=$8,lat=$9,lng=$10,delivery_instructions=$11,
       is_default=case when $12 then true else is_default end,updated_at=now() where id=$1 and user_id=$2 returning *`,
      [id, request.actor!.userId, input.label, input.contact_name, input.phone_e164, input.line1, input.area, input.city, input.lat ?? null, input.lng ?? null, input.delivery_instructions ?? null, input.make_default],
    );
    if (!result.rowCount) { await client.query("rollback"); return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Address not found" } }); }
    await client.query("commit");
    return { data: result.rows[0] };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.delete("/v1/me/addresses/:id", { preHandler: requireProfile }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await query("delete from addresses where id=$1 and user_id=$2 returning is_default", [id, request.actor!.userId]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Address not found" } });
  if (result.rows[0].is_default) await query("update addresses set is_default=true,updated_at=now() where id=(select id from addresses where user_id=$1 order by created_at desc limit 1)", [request.actor!.userId]);
  return reply.code(204).send();
});

app.put("/v1/me/addresses/:id/default", { preHandler: requireProfile }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const owns = await client.query("select 1 from addresses where id=$1 and user_id=$2", [id, request.actor!.userId]);
    if (!owns.rowCount) { await client.query("rollback"); return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Address not found" } }); }
    await client.query("update addresses set is_default=false,updated_at=now() where user_id=$1", [request.actor!.userId]);
    const result = await client.query("update addresses set is_default=true,updated_at=now() where id=$1 returning *", [id]);
    await client.query("commit");
    return { data: result.rows[0] };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/me/favorites", { preHandler: requireProfile }, async (request) => {
  const result = await query(`${productSelect} join favorites f on f.product_id=p.id where f.user_id=$1 and p.active=true order by f.created_at desc`, [request.actor!.userId]);
  return { data: result.rows };
});

app.put("/v1/me/favorites/:productId", { preHandler: requireProfile }, async (request, reply) => {
  const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
  const result = await query("insert into favorites(user_id,product_id) select $1,id from products where id=$2 and active=true on conflict do nothing returning product_id", [request.actor!.userId, productId]);
  if (!result.rowCount) {
    const exists = await query("select 1 from products where id=$1 and active=true", [productId]);
    if (!exists.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Product not found" } });
  }
  return reply.code(204).send();
});

app.delete("/v1/me/favorites/:productId", { preHandler: requireProfile }, async (request, reply) => {
  const { productId } = z.object({ productId: z.string().uuid() }).parse(request.params);
  await query("delete from favorites where user_id=$1 and product_id=$2", [request.actor!.userId, productId]);
  return reply.code(204).send();
});

app.get("/v1/me/coupons", { preHandler: requireProfile }, async (request) => {
  const result = await query(
    `${couponSelect},uc.id as user_coupon_id,uc.source,uc.status as issued_status,uc.issued_at,uc.expires_at,
       uc.reserved_at,uc.redeemed_at,uc.revoked_at,
       case
         when uc.status='REVOKED' then 'REVOKED'
         when uc.status='REDEEMED' then 'USED'
         when uc.status='RESERVED' then 'RESERVED'
         when now() >= least(uc.expires_at,c.ends_at) then 'EXPIRED'
         when c.status in ('PAUSED','ARCHIVED') or not c.redemption_enabled then 'UNAVAILABLE'
         when now() < c.starts_at then 'UPCOMING'
         else 'AVAILABLE'
       end as wallet_status
     from coupons c join user_coupons uc on uc.coupon_id=c.id
     where uc.user_id=$1
     order by case uc.status when 'ISSUED' then 0 when 'RESERVED' then 1 when 'REDEEMED' then 2 else 3 end,
       least(uc.expires_at,c.ends_at),uc.issued_at desc`,
    [request.actor!.userId],
  );
  return { data: result.rows };
});

const checkoutSchema = z.object({
  items: z.array(z.object({ product_id: z.string(), quantity: z.number().int().min(1).max(20), customization: z.record(z.string(), z.unknown()).default({}) })).min(1).max(50),
  fulfillment: z.object({ type: z.enum(["PICKUP", "DELIVERY", "SHIPPING"]), store_id: z.string().optional(), address_id: z.string().uuid().optional() }),
  coupon_code: z.string().trim().min(3).max(40).optional(),
  payment_method: z.object({ provider: z.literal("MOCK"), token: z.enum(["test_ok", "test_declined", "test_timeout"]) }),
});

app.post("/v1/checkouts", { preHandler: requireProfile }, async (request, reply) => {
  const input = checkoutSchema.parse(request.body);
  const idempotencyKey = String(request.headers["idempotency-key"] ?? "");
  if (!idempotencyKey) return reply.code(400).send({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required" } });
  const existing = await query("select o.order_number,o.payment_status from payments p join orders o on o.id=p.order_id where p.idempotency_key=$1", [idempotencyKey]);
  if (existing.rowCount) return { data: existing.rows[0], idempotent_replay: true };

  const ids = input.items.map((item) => item.product_id);
  const products = await query<any>(`${productSelect} where p.active=true and (p.id::text=any($1::text[]) or p.external_code=any($1::text[]))`, [ids]);
  const byId = new Map(products.rows.flatMap((product: any) => [[product.id, product], [product.external_code, product]]));
  if (input.items.some((item) => !byId.has(item.product_id))) return reply.code(422).send({ error: { code: "PRODUCT_UNAVAILABLE", message: "One or more products are unavailable" } });
  const toppingCodes = [...new Set(input.items.flatMap((item) =>
    Array.isArray(item.customization.toppings)
      ? item.customization.toppings.filter((value): value is string => typeof value === "string")
      : [],
  ))];
  const toppings = toppingCodes.length
    ? await query<any>(`${productSelect} where p.active=true and p.category_slug='add-ons' and p.external_code=any($1::text[])`, [toppingCodes])
    : { rows: [] as any[] };
  const toppingByCode = new Map(toppings.rows.map((product: any) => [product.external_code, product]));
  if (toppingCodes.some((code) => !toppingByCode.has(code))) return reply.code(422).send({ error: { code: "TOPPING_UNAVAILABLE", message: "One or more add-ons are unavailable" } });
  const pricedItems = input.items.map((item) => {
    const product = byId.get(item.product_id);
    const size = typeof item.customization.size === "string" ? item.customization.size : undefined;
    const sizePrice = size ? Number(product.size_prices_json?.[size]) : Number.NaN;
    const basePrice = Number.isFinite(sizePrice) && sizePrice > 0 ? sizePrice : product.base_price;
    const productPrice = Math.round(basePrice * (100 - product.discount_percent) / 100);
    const toppingPrice = (Array.isArray(item.customization.toppings) ? item.customization.toppings : [])
      .reduce((sum: number, code: unknown) => sum + (typeof code === "string" ? Number(toppingByCode.get(code)?.effective_price ?? 0) : 0), 0);
    return { ...item, product, unitPrice: productPrice + toppingPrice };
  });
  const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = input.fulfillment.type === "DELIVERY" ? 150 : input.fulfillment.type === "SHIPPING" ? 300 : 0;
  const paymentStatus = input.payment_method.token === "test_ok" ? "PAID" : input.payment_method.token === "test_declined" ? "DECLINED" : "PENDING";
  const orderNumber = `KY-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")}`;
  const client = await pool.connect();
  try {
    await client.query("begin");
    let appliedCoupon: CouponRow | null = null;
    let appliedUserCouponId: string | null = null;
    let discount = 0;
    if (input.coupon_code?.trim()) {
      const couponResult = await client.query<CouponRow>(
        "select * from coupons where lower(code)=lower($1) for update",
        [input.coupon_code.trim()],
      );
      appliedCoupon = couponResult.rows[0] ?? null;
      if (!appliedCoupon) {
        await client.query("rollback");
        return reply.code(422).send({ error: { code: "COUPON_INVALID", message: "Coupon was not found" } });
      }
      const now = Date.now();
      if (
        !appliedCoupon.redemption_enabled ||
        !["ACTIVE", "SCHEDULED"].includes(appliedCoupon.status) ||
        now < new Date(appliedCoupon.starts_at).getTime() ||
        now >= new Date(appliedCoupon.ends_at).getTime()
      ) {
        await client.query("rollback");
        return reply.code(422).send({ error: { code: "COUPON_UNAVAILABLE", message: "Coupon is not currently available" } });
      }
      if (
        appliedCoupon.fulfillment_scope !== "ALL" &&
        appliedCoupon.fulfillment_scope !== input.fulfillment.type
      ) {
        await client.query("rollback");
        return reply.code(422).send({ error: { code: "COUPON_FULFILLMENT_MISMATCH", message: "Coupon does not apply to this fulfilment method" } });
      }
      if (appliedCoupon.issuance_mode === "ASSIGNED") {
        const issued = await client.query<{ id: string }>(
          `select id from user_coupons
           where coupon_id=$1 and user_id=$2 and status='ISSUED' and now()<expires_at
           order by expires_at,issued_at for update skip locked limit 1`,
          [appliedCoupon.id, request.actor!.userId],
        );
        if (!issued.rowCount) {
          await client.query("rollback");
          return reply.code(422).send({ error: { code: "COUPON_NOT_OWNED", message: "This coupon is not available in your wallet" } });
        }
        appliedUserCouponId = issued.rows[0].id;
      }
      const usage = await client.query<{ total: number; user_total: number }>(
        `select count(*)::int as total,
          count(*) filter (where user_id=$2)::int as user_total
         from coupon_redemptions where coupon_id=$1 and status in ('RESERVED','REDEEMED')`,
        [appliedCoupon.id, request.actor!.userId],
      );
      if (appliedCoupon.usage_limit != null && usage.rows[0].total >= appliedCoupon.usage_limit) {
        await client.query("rollback");
        return reply.code(409).send({ error: { code: "COUPON_LIMIT_REACHED", message: "Coupon usage limit has been reached" } });
      }
      if (usage.rows[0].user_total >= appliedCoupon.per_user_limit) {
        await client.query("rollback");
        return reply.code(409).send({ error: { code: "COUPON_USER_LIMIT_REACHED", message: "You have already used this coupon" } });
      }
      const calculated = calculateCouponDiscount(appliedCoupon, pricedItems);
      if (calculated.error) {
        await client.query("rollback");
        return reply.code(422).send({ error: { code: "COUPON_NOT_APPLICABLE", message: calculated.error } });
      }
      discount = calculated.discount;
    }
    const total = Math.max(0, subtotal - discount + deliveryFee);
    let addressSnapshot = null;
    if (input.fulfillment.address_id) {
      const address = await client.query("select * from addresses where id=$1 and user_id=$2", [input.fulfillment.address_id, request.actor!.userId]);
      if (!address.rowCount) { await client.query("rollback"); return reply.code(422).send({ error: { code: "ADDRESS_INVALID", message: "Delivery address is invalid" } }); }
      addressSnapshot = address.rows[0];
    }
    const store = input.fulfillment.store_id
      ? await client.query("select id from stores where (id::text=$1 or code=$1) and status='ACTIVE'", [input.fulfillment.store_id])
      : { rows: [] };
    if (input.fulfillment.type !== "SHIPPING" && !store.rows[0]) { await client.query("rollback"); return reply.code(422).send({ error: { code: "STORE_REQUIRED", message: "Choose an active store" } }); }
    const order = await client.query(
      `insert into orders(order_number,user_id,subtotal,discount,delivery_fee,total,payment_status,is_test) values($1,$2,$3,$4,$5,$6,$7,true) returning id,order_number,subtotal,discount,delivery_fee,total,payment_status,created_at`,
      [orderNumber, request.actor!.userId, subtotal, discount, deliveryFee, total, paymentStatus],
    );
    const fulfillment = await client.query(
      `insert into fulfillment_groups(order_id,type,store_id,address_id,address_snapshot_json,status,promised_at)
       values($1,$2,$3,$4,$5,'PLACED',case when $2='PICKUP' then now()+interval '20 minutes' else null end) returning id,status,promised_at`,
      [order.rows[0].id, input.fulfillment.type, store.rows[0]?.id ?? null, input.fulfillment.address_id ?? null, addressSnapshot],
    );
    for (const item of pricedItems) {
      const product = item.product;
      await client.query(
        `insert into order_items(order_id,fulfillment_group_id,product_id,kind,name_snapshot,sku_snapshot,unit_price,quantity,customization_json,line_total)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [order.rows[0].id, fulfillment.rows[0].id, product.id, product.kind, product.name_en, product.external_code, item.unitPrice, item.quantity, item.customization, item.unitPrice * item.quantity],
      );
    }
    await client.query(
      `insert into payments(order_id,provider,provider_ref,idempotency_key,amount,status,is_test,payload_redacted_json)
       values($1,'MOCK',$2,$3,$4,$5,true,$6)`,
      [order.rows[0].id, `mock_${randomUUID()}`, idempotencyKey, total, paymentStatus, { token: input.payment_method.token }],
    );
    if (appliedCoupon && paymentStatus !== "DECLINED") {
      const redemptionStatus = paymentStatus === "PAID" ? "REDEEMED" : "RESERVED";
      await client.query(
        `insert into coupon_redemptions(coupon_id,user_coupon_id,user_id,order_id,discount_amount,rule_snapshot_json,status,idempotency_key,redeemed_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,case when $7='REDEEMED' then now() else null end)`,
        [
          appliedCoupon.id,
          appliedUserCouponId,
          request.actor!.userId,
          order.rows[0].id,
          discount,
          {
            code: appliedCoupon.code,
            discount_type: appliedCoupon.discount_type,
            discount_value: appliedCoupon.discount_value,
            max_discount: appliedCoupon.max_discount,
            min_spend: appliedCoupon.min_spend,
            scope_type: appliedCoupon.scope_type,
            scope_value: appliedCoupon.scope_value,
            fulfillment_scope: appliedCoupon.fulfillment_scope,
            version: appliedCoupon.version,
          },
          redemptionStatus,
          idempotencyKey,
        ],
      );
      if (appliedUserCouponId) {
        await client.query(
          `update user_coupons set status=$2,reserved_at=now(),redeemed_at=case when $2='REDEEMED' then now() else null end where id=$1`,
          [appliedUserCouponId, redemptionStatus],
        );
      }
    }
    let pickupQrPayload: string | null = null;
    if (input.fulfillment.type === "PICKUP" && paymentStatus !== "DECLINED") {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pickup = createPickupToken(fulfillment.rows[0].id, expiresAt);
      await client.query("insert into pickup_tokens(fulfillment_group_id,token_hash,expires_at) values($1,$2,$3)", [fulfillment.rows[0].id, pickup.hash, expiresAt]);
      pickupQrPayload = pickup.token;
    }
    await client.query("commit");
    return reply.code(201).send({ data: { ...order.rows[0], coupon_code: appliedCoupon?.code ?? null, fulfillment: fulfillment.rows[0], pickup_qr_payload: pickupQrPayload } });
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.get("/v1/me/orders", { preHandler: requireProfile }, async (request) => {
  const result = await query(
    `select o.order_number,o.currency,o.subtotal,o.discount,o.delivery_fee,o.total,o.payment_status,o.is_test,o.created_at,
      (select c.code from coupon_redemptions cr join coupons c on c.id=cr.coupon_id where cr.order_id=o.id and cr.status in ('RESERVED','REDEEMED') limit 1) as coupon_code,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id',f.id,
            'type',f.type,
            'status',f.status,
            'promised_at',f.promised_at,
            'store_id',f.store_id,
            'address_id',f.address_id,
            'store',case when s.id is null then null else jsonb_build_object(
              'id',s.id,'code',s.code,'name',s.name,'area',s.area,'address',s.address,
              'phone',s.phone,'lat',s.lat::float,'lng',s.lng::float,'location_verified',s.location_verified
            ) end,
            'address',f.address_snapshot_json,
            'items',coalesce((
              select jsonb_agg(jsonb_build_object(
                'id',oi.id,'product_id',oi.product_id,'product_code',p.external_code,
                'name',oi.name_snapshot,'name_zh',p.name_zh,'kind',oi.kind,'quantity',oi.quantity,
                'unit_price',oi.unit_price,'line_total',oi.line_total,
                'customization',oi.customization_json,'image_key',p.image_key
              ) order by oi.id)
              from order_items oi left join products p on p.id=oi.product_id
              where oi.fulfillment_group_id=f.id
            ),'[]'::jsonb),
            'pickup',(
              select jsonb_build_object(
                'expires_at',pt.expires_at,
                'redeemed_at',pt.redeemed_at,
                'token_fingerprint',left(pt.token_hash,16),
                'can_reissue',pt.redeemed_at is null and f.status not in ('COMPLETED','CANCELLED')
              )
              from pickup_tokens pt where pt.fulfillment_group_id=f.id
            )
          ) order by f.created_at
        )
        from fulfillment_groups f left join stores s on s.id=f.store_id
        where f.order_id=o.id
      ),'[]'::jsonb) as fulfillments
     from orders o where o.user_id=$1 order by o.created_at desc limit 50`,
    [request.actor!.userId],
  );
  return { data: result.rows };
});

app.post("/v1/me/orders/:orderNumber/pickup-token", { preHandler: requireProfile }, async (request, reply) => {
  const { orderNumber } = z.object({ orderNumber: z.string().trim().min(6).max(80) }).parse(request.params);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select pt.id,f.id as fulfillment_id,f.status,pt.redeemed_at
       from orders o join fulfillment_groups f on f.order_id=o.id
       join pickup_tokens pt on pt.fulfillment_group_id=f.id
       where o.order_number=$1 and o.user_id=$2 and f.type='PICKUP'
       for update of pt`,
      [orderNumber, request.actor!.userId],
    );
    const pickup = result.rows[0];
    if (!pickup) {
      await client.query("rollback");
      return reply.code(404).send({ error: { code: "PICKUP_NOT_FOUND", message: "Pickup order not found" } });
    }
    if (pickup.redeemed_at || pickup.status === "COMPLETED") {
      await client.query("rollback");
      return reply.code(409).send({ error: { code: "PICKUP_COMPLETED", message: "This pickup has already been completed" } });
    }
    if (pickup.status === "CANCELLED") {
      await client.query("rollback");
      return reply.code(409).send({ error: { code: "PICKUP_CANCELLED", message: "This pickup order is cancelled" } });
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextToken = createPickupToken(pickup.fulfillment_id, expiresAt);
    await client.query(
      "update pickup_tokens set token_hash=$2,expires_at=$3 where id=$1",
      [pickup.id, nextToken.hash, expiresAt],
    );
    await client.query("commit");
    return {
      data: {
        order_number: orderNumber,
        pickup_qr_payload: nextToken.token,
        token_fingerprint: nextToken.hash.slice(0, 16),
        expires_at: expiresAt.toISOString(),
      },
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

app.get("/v1/admin/products", { preHandler: requireAdmin }, async (request) => {
  const result = await query(`${productSelect} order by p.updated_at desc`);
  return { data: result.rows };
});

app.post("/v1/admin/products", { preHandler: requireAdmin }, async (request, reply) => {
  const input = productWriteSchema.extend({ kind: z.enum(["DRINK", "GOODS"]) }).parse(request.body);
  if (!(await assertActiveTag(input.tag_id, reply))) return;
  try {
    const result = await query(
      `insert into products(kind,category_slug,slug,name_en,name_zh,description_en,description_zh,image_key,base_price,size_prices_json,discount_percent,tag_id,active,updated_by)
       values($1,$2,$3,$4,$5,$6,$7,null,$8,$9,$10,$11,false,$12) returning *`,
      [input.kind, input.category_slug, productSlug(input.name_en, input.category_slug), input.name_en, input.name_zh, input.description_en, input.description_zh, input.base_price, { "One size": input.base_price }, input.discount_percent, input.tag_id, request.actor!.userId],
    );
    await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'PRODUCT_CREATED','product',$2,$3)", [request.actor!.userId, result.rows[0].id, request.id]);
    return reply.code(201).send({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") return reply.code(409).send({ error: { code: "PRODUCT_EXISTS", message: "A product with this slug already exists" } });
    throw error;
  }
});

app.patch("/v1/admin/products/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = productWriteSchema.partial().extend({ active: z.boolean().optional(), catalog_version: z.number().int().positive() }).parse(request.body);
  if (Object.hasOwn(input, "tag_id") && !(await assertActiveTag(input.tag_id ?? null, reply))) return;
  const current = await query<{ image_key: string | null; catalog_version: number }>("select image_key,catalog_version from products where id=$1", [id]);
  if (!current.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Product not found" } });
  if (input.active === true && !current.rows[0].image_key?.startsWith(`gcs://${config.mediaBucket}/products/`)) {
    return reply.code(422).send({ error: { code: "PRODUCT_IMAGE_REQUIRED", message: "Upload a product image to the KIYOYO media bucket before publishing" } });
  }
  const result = await query(
    `update products set name_en=coalesce($2,name_en),name_zh=coalesce($3,name_zh),description_en=coalesce($4,description_en),description_zh=coalesce($5,description_zh),category_slug=coalesce($6,category_slug),base_price=coalesce($7,base_price),discount_percent=coalesce($8,discount_percent),
      active=coalesce($9,active),tag_id=case when $10::boolean then $11::uuid else tag_id end,catalog_version=catalog_version+1,updated_at=now(),updated_by=$12
     where id=$1 and catalog_version=$13 returning *`,
    [id, input.name_en ?? null, input.name_zh ?? null, input.description_en ?? null, input.description_zh ?? null, input.category_slug ?? null, input.base_price ?? null, input.discount_percent ?? null, input.active ?? null, Object.hasOwn(input, "tag_id"), input.tag_id ?? null, request.actor!.userId, input.catalog_version],
  );
  if (!result.rowCount) return reply.code(409).send({ error: { code: "VERSION_CONFLICT", message: "Product was changed by another admin; refresh and retry" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'PRODUCT_UPDATED','product',$2,$3)", [request.actor!.userId, id, request.id]);
  return { data: result.rows[0] };
});

app.post("/v1/admin/products/:id/media-upload", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ filename: z.string().trim().min(1).max(180), content_type: z.enum(["image/jpeg", "image/png", "image/webp"]), bytes: z.number().int().positive().max(8_000_000) }).parse(request.body);
  const product = await query("select 1 from products where id=$1", [id]);
  if (!product.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Product not found" } });
  const extension = input.content_type === "image/jpeg" ? "jpg" : input.content_type === "image/png" ? "png" : "webp";
  const objectKey = `products/${id}/${randomUUID()}.${extension}`;
  const file = storage.bucket(config.mediaBucket).file(objectKey);
  const [uploadUrl] = await file.getSignedUrl({ version: "v4", action: "write", expires: Date.now() + 10 * 60 * 1000, contentType: input.content_type });
  return { data: { upload_url: uploadUrl, object_key: objectKey, expires_in_seconds: 600 } };
});

app.post("/v1/admin/products/:id/media-confirm", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ object_key: z.string().startsWith(`products/${id}/`).max(500), catalog_version: z.number().int().positive() }).parse(request.body);
  const file = storage.bucket(config.mediaBucket).file(input.object_key);
  const [metadata] = await file.getMetadata().catch(() => [null]);
  if (!metadata) return reply.code(422).send({ error: { code: "UPLOAD_MISSING", message: "Uploaded image was not found" } });
  const validContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!metadata.contentType || !validContentTypes.has(metadata.contentType) || Number(metadata.size ?? 0) > 8_000_000) {
    await file.delete({ ignoreNotFound: true });
    return reply.code(422).send({ error: { code: "UPLOAD_INVALID", message: "Uploaded media must be a JPG, PNG or WebP image under 8 MB" } });
  }
  const result = await query("update products set image_key=$2,catalog_version=catalog_version+1,updated_at=now(),updated_by=$3 where id=$1 and catalog_version=$4 returning *", [id, `gcs://${config.mediaBucket}/${input.object_key}`, request.actor!.userId, input.catalog_version]);
  if (!result.rowCount) {
    await file.delete({ ignoreNotFound: true });
    return reply.code(409).send({ error: { code: "VERSION_CONFLICT", message: "Product changed while the image was uploading; refresh and retry" } });
  }
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json) values($1,'PRODUCT_MEDIA_UPDATED','product',$2,$3,$4)", [request.actor!.userId, id, request.id, { object_key: input.object_key, content_type: metadata.contentType, bytes: Number(metadata.size ?? 0) }]);
  return { data: result.rows[0] };
});

app.get("/v1/admin/product-tags", { preHandler: requireAdmin }, async () => {
  const result = await query("select * from product_tags order by active desc,label");
  return { data: result.rows };
});

app.post("/v1/admin/product-tags", { preHandler: requireAdmin }, async (request, reply) => {
  const input = z.object({ label: z.string().trim().min(1).max(30), tone: z.enum(["RED", "YELLOW", "BLACK", "GREEN"]) }).parse(request.body);
  try {
    const result = await query("insert into product_tags(label,tone,created_by) values($1,$2,$3) returning *", [input.label.toUpperCase(), input.tone, request.actor!.userId]);
    return reply.code(201).send({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") return reply.code(409).send({ error: { code: "TAG_EXISTS", message: "A tag with this label already exists" } });
    throw error;
  }
});

app.patch("/v1/admin/product-tags/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ label: z.string().trim().min(1).max(30).optional(), tone: z.enum(["RED", "YELLOW", "BLACK", "GREEN"]).optional(), active: z.boolean().optional() }).parse(request.body);
  const result = await query("update product_tags set label=coalesce($2,label),tone=coalesce($3,tone),active=coalesce($4,active),updated_at=now() where id=$1 returning *", [id, input.label?.toUpperCase() ?? null, input.tone ?? null, input.active ?? null]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Tag not found" } });
  return { data: result.rows[0] };
});

app.delete("/v1/admin/product-tags/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update products set tag_id=null,catalog_version=catalog_version+1,updated_at=now() where tag_id=$1", [id]);
    const result = await client.query("update product_tags set active=false,updated_at=now() where id=$1 returning id", [id]);
    await client.query("commit");
    if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Tag not found" } });
    return reply.code(204).send();
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

const couponCreateSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name_en: z.string().trim().min(1).max(120),
  name_zh: z.string().trim().min(1).max(120),
  description_en: z.string().trim().max(500).default(""),
  description_zh: z.string().trim().max(500).default(""),
  discount_type: z.enum(["PERCENT", "FIXED", "FREE_SIZE_UPGRADE"]),
  discount_value: z.number().int().min(0),
  max_discount: z.number().int().min(0).nullable().default(null),
  min_spend: z.number().int().min(0).default(0),
  scope_type: z.enum(["ALL", "DRINKS", "GOODS", "CATEGORY", "PRODUCT"]).default("ALL"),
  scope_value: z.string().trim().max(120).nullable().default(null),
  fulfillment_scope: z.enum(["ALL", "PICKUP", "DELIVERY", "SHIPPING"]).default("ALL"),
  issuance_mode: z.enum(["PUBLIC_CODE", "ASSIGNED"]).default("ASSIGNED"),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  issuance_limit: z.number().int().positive().nullable().default(null),
  usage_limit: z.number().int().positive().nullable().default(null),
  per_user_limit: z.number().int().positive().max(100).default(1),
  stackable: z.boolean().default(false),
}).superRefine((coupon, context) => {
  if (new Date(coupon.ends_at) <= new Date(coupon.starts_at)) {
    context.addIssue({ code: "custom", message: "End time must be after start time", path: ["ends_at"] });
  }
  if (["CATEGORY", "PRODUCT"].includes(coupon.scope_type) && !coupon.scope_value) {
    context.addIssue({ code: "custom", message: "Choose an applicable category or product", path: ["scope_value"] });
  }
  if (coupon.discount_type === "PERCENT" && (coupon.discount_value < 1 || coupon.discount_value > 100)) {
    context.addIssue({ code: "custom", message: "Percentage must be between 1 and 100", path: ["discount_value"] });
  }
  if (coupon.discount_type === "FIXED" && coupon.discount_value < 1) {
    context.addIssue({ code: "custom", message: "Fixed discount must be greater than zero", path: ["discount_value"] });
  }
  if (coupon.discount_type === "FREE_SIZE_UPGRADE" && coupon.discount_value !== 0) {
    context.addIssue({ code: "custom", message: "Free size upgrade does not use a discount value", path: ["discount_value"] });
  }
});

app.get("/v1/admin/coupons", { preHandler: requireAdmin }, async () => {
  const result = await query(
    `${couponSelect},
       (select count(*)::int from user_coupons uc where uc.coupon_id=c.id) as issued_count,
       (select count(*)::int from coupon_redemptions cr where cr.coupon_id=c.id and cr.status='REDEEMED') as redeemed_count,
       (select coalesce(sum(cr.discount_amount),0)::int from coupon_redemptions cr where cr.coupon_id=c.id and cr.status='REDEEMED') as discount_total
     from coupons c order by c.updated_at desc`,
  );
  return { data: result.rows };
});

app.post("/v1/admin/coupons", { preHandler: requireAdmin }, async (request, reply) => {
  const input = couponCreateSchema.parse(request.body);
  try {
    const result = await query(
      `insert into coupons(code,name_en,name_zh,description_en,description_zh,discount_type,discount_value,max_discount,min_spend,
         scope_type,scope_value,fulfillment_scope,issuance_mode,starts_at,ends_at,issuance_limit,usage_limit,per_user_limit,stackable,created_by,updated_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20) returning *`,
      [input.code.toUpperCase(),input.name_en,input.name_zh,input.description_en,input.description_zh,input.discount_type,input.discount_value,
       input.max_discount,input.min_spend,input.scope_type,input.scope_value || null,input.fulfillment_scope,input.issuance_mode,input.starts_at,
       input.ends_at,input.issuance_limit,input.usage_limit,input.per_user_limit,input.stackable,request.actor!.userId],
    );
    await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'COUPON_CREATED','coupon',$2,$3)", [request.actor!.userId, result.rows[0].id, request.id]);
    return reply.code(201).send({ data: result.rows[0] });
  } catch (error: any) {
    if (error.code === "23505") return reply.code(409).send({ error: { code: "COUPON_CODE_EXISTS", message: "A coupon with this code already exists" } });
    throw error;
  }
});

app.patch("/v1/admin/coupons/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = couponCreateSchema.and(z.object({ version: z.number().int().positive() })).parse(request.body);
  const redeemed = await query("select 1 from coupon_redemptions where coupon_id=$1 and status='REDEEMED' limit 1", [id]);
  if (redeemed.rowCount) return reply.code(409).send({ error: { code: "COUPON_ALREADY_USED", message: "Used coupons cannot change rules; duplicate this coupon instead" } });
  try {
    const result = await query(
      `update coupons set code=$2,name_en=$3,name_zh=$4,description_en=$5,description_zh=$6,discount_type=$7,discount_value=$8,
         max_discount=$9,min_spend=$10,scope_type=$11,scope_value=$12,fulfillment_scope=$13,issuance_mode=$14,starts_at=$15,ends_at=$16,
         issuance_limit=$17,usage_limit=$18,per_user_limit=$19,stackable=$20,version=version+1,updated_by=$21,updated_at=now()
       where id=$1 and version=$22 returning *`,
      [id,input.code.toUpperCase(),input.name_en,input.name_zh,input.description_en,input.description_zh,input.discount_type,input.discount_value,
       input.max_discount,input.min_spend,input.scope_type,input.scope_value || null,input.fulfillment_scope,input.issuance_mode,input.starts_at,
       input.ends_at,input.issuance_limit,input.usage_limit,input.per_user_limit,input.stackable,request.actor!.userId,input.version],
    );
    if (!result.rowCount) return reply.code(409).send({ error: { code: "VERSION_CONFLICT", message: "Coupon was changed by another admin; refresh and retry" } });
    await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'COUPON_UPDATED','coupon',$2,$3)", [request.actor!.userId, id, request.id]);
    return { data: result.rows[0] };
  } catch (error: any) {
    if (error.code === "23505") return reply.code(409).send({ error: { code: "COUPON_CODE_EXISTS", message: "A coupon with this code already exists" } });
    throw error;
  }
});

app.post("/v1/admin/coupons/:id/publish", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await query(
    `update coupons set status=case when starts_at>now() then 'SCHEDULED' else 'ACTIVE' end,issuance_enabled=true,redemption_enabled=true,
       published_at=coalesce(published_at,now()),version=version+1,updated_by=$2,updated_at=now()
     where id=$1 and ends_at>now() and status<>'ARCHIVED' returning *`,
    [id, request.actor!.userId],
  );
  if (!result.rowCount) return reply.code(422).send({ error: { code: "COUPON_NOT_PUBLISHABLE", message: "Coupon is archived, expired, or missing" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'COUPON_PUBLISHED','coupon',$2,$3)", [request.actor!.userId, id, request.id]);
  return { data: result.rows[0] };
});

app.post("/v1/admin/coupons/:id/stop-distribution", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await query("update coupons set issuance_enabled=false,version=version+1,updated_by=$2,updated_at=now() where id=$1 and status not in ('DRAFT','ARCHIVED') returning *", [id, request.actor!.userId]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Published coupon not found" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'COUPON_DISTRIBUTION_STOPPED','coupon',$2,$3)", [request.actor!.userId, id, request.id]);
  return { data: result.rows[0] };
});

app.post("/v1/admin/coupons/:id/disable", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const { reason } = z.object({ reason: z.string().trim().min(3).max(240) }).parse(request.body);
  const result = await query("update coupons set status='PAUSED',issuance_enabled=false,redemption_enabled=false,version=version+1,updated_by=$2,updated_at=now() where id=$1 and status<>'ARCHIVED' returning *", [id, request.actor!.userId]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Coupon not found" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json) values($1,'COUPON_DISABLED','coupon',$2,$3,$4)", [request.actor!.userId, id, request.id, { reason }]);
  return { data: result.rows[0] };
});

app.post("/v1/admin/coupons/:id/archive", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const result = await query("update coupons set status='ARCHIVED',issuance_enabled=false,redemption_enabled=false,version=version+1,updated_by=$2,updated_at=now() where id=$1 returning *", [id, request.actor!.userId]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Coupon not found" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'COUPON_ARCHIVED','coupon',$2,$3)", [request.actor!.userId, id, request.id]);
  return { data: result.rows[0] };
});

app.get("/v1/admin/orders", { preHandler: requireAdmin }, async () => {
  const result = await query(
    `select o.order_number,o.total,o.payment_status,o.is_test,o.created_at,u.nickname,u.email,
            f.id as fulfillment_id,f.type,f.status,f.address_snapshot_json,
            s.code as store_code,s.name as store_name,
            coalesce((
              select jsonb_agg(jsonb_build_object(
                'id',oi.id,'product_id',oi.product_id,'product_code',p.external_code,
                'name',oi.name_snapshot,'kind',oi.kind,'quantity',oi.quantity,
                'unit_price',oi.unit_price,'line_total',oi.line_total,
                'customization',oi.customization_json
              ) order by oi.id)
              from order_items oi left join products p on p.id=oi.product_id
              where oi.fulfillment_group_id=f.id
            ),'[]'::jsonb) as items
     from orders o join users u on u.id=o.user_id join fulfillment_groups f on f.order_id=o.id
     left join stores s on s.id=f.store_id order by o.created_at desc limit 100`,
  );
  return { data: result.rows };
});

app.get("/v1/admin/customers", { preHandler: requireAdmin }, async (request) => {
  const input = z.object({ query: z.string().max(100).optional() }).parse(request.query);
  const term = input.query ? `%${input.query}%` : null;
  const result = await query(
    `select u.id,u.email,u.nickname,u.gender,u.birth_year,u.locale,u.status,u.created_at,count(o.id)::int as order_count,coalesce(sum(o.total),0)::int as lifetime_value
     from users u left join orders o on o.user_id=u.id where ($1::text is null or u.email ilike $1 or u.nickname ilike $1)
     group by u.id order by u.created_at desc limit 100`,
    [term],
  );
  return { data: result.rows };
});

app.get("/v1/admin/customers/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const [member, addresses, orders, coupons] = await Promise.all([
    query("select id,email,nickname,gender,birth_year,locale,status,created_at,updated_at from users where id=$1", [id]),
    query("select * from addresses where user_id=$1 order by is_default desc,created_at desc", [id]),
    query("select order_number,total,payment_status,is_test,created_at from orders where user_id=$1 order by created_at desc limit 50", [id]),
    query(
      `select uc.id as user_coupon_id,uc.status,uc.source,uc.issued_at,uc.expires_at,uc.redeemed_at,uc.revoked_at,uc.revoke_reason,
         case
           when uc.status='REVOKED' then 'REVOKED'
           when uc.status='REDEEMED' then 'USED'
           when uc.status='RESERVED' then 'RESERVED'
           when now()>=least(uc.expires_at,c.ends_at) then 'EXPIRED'
           when now()<c.starts_at then 'UPCOMING'
           when c.status in ('PAUSED','ARCHIVED') or not c.redemption_enabled then 'UNAVAILABLE'
           else 'AVAILABLE'
         end as wallet_status,
         c.id as coupon_id,c.code,c.name_en,c.name_zh,c.discount_type,c.discount_value
       from user_coupons uc join coupons c on c.id=uc.coupon_id where uc.user_id=$1
       order by uc.issued_at desc limit 100`,
      [id],
    ),
  ]);
  if (!member.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Customer not found" } });
  return { data: { ...member.rows[0], addresses: addresses.rows, orders: orders.rows, coupons: coupons.rows } };
});

app.patch("/v1/admin/customers/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ nickname: z.string().trim().min(1).max(80).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }).parse(request.body);
  const result = await query("update users set nickname=coalesce($2,nickname),status=coalesce($3,status),updated_at=now() where id=$1 returning id,email,nickname,status,updated_at", [id, input.nickname ?? null, input.status ?? null]);
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Customer not found" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'CUSTOMER_UPDATED','user',$2,$3)", [request.actor!.userId, id, request.id]);
  return { data: result.rows[0] };
});

app.post("/v1/admin/customers/:id/coupons", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ coupon_id: z.string().uuid(), expires_at: z.string().datetime({ offset: true }).optional() }).parse(request.body);
  const couponResult = await query<CouponRow>(
    `select * from coupons where id=$1 and issuance_mode='ASSIGNED' and issuance_enabled=true and status in ('ACTIVE','SCHEDULED') and ends_at>now()`,
    [input.coupon_id],
  );
  const coupon = couponResult.rows[0];
  if (!coupon) return reply.code(422).send({ error: { code: "COUPON_NOT_ISSUABLE", message: "Choose a published assigned coupon" } });
  const expiresAt = input.expires_at ? new Date(input.expires_at) : new Date(coupon.ends_at);
  if (expiresAt <= new Date() || expiresAt > new Date(coupon.ends_at)) {
    return reply.code(422).send({ error: { code: "COUPON_EXPIRY_INVALID", message: "User coupon expiry must be in the future and no later than the campaign end" } });
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const customer = await client.query("select 1 from users where id=$1 and status='ACTIVE'", [id]);
    if (!customer.rowCount) {
      await client.query("rollback");
      return reply.code(422).send({ error: { code: "CUSTOMER_NOT_ACTIVE", message: "Coupon can only be issued to an active customer" } });
    }
    const issued = await client.query(
      `select count(*)::int as count from user_coupons where coupon_id=$1 and user_id=$2 and status in ('ISSUED','RESERVED','REDEEMED')`,
      [coupon.id, id],
    );
    if (issued.rows[0].count >= coupon.per_user_limit) {
      await client.query("rollback");
      return reply.code(409).send({ error: { code: "COUPON_USER_LIMIT_REACHED", message: "This customer has reached the coupon limit" } });
    }
    if (coupon.issuance_limit != null) {
      const total = await client.query(
        "select count(*)::int as count from user_coupons where coupon_id=$1",
        [coupon.id],
      );
      if (total.rows[0].count >= coupon.issuance_limit) {
        await client.query("rollback");
        return reply.code(409).send({ error: { code: "COUPON_LIMIT_REACHED", message: "Coupon issuance limit has been reached" } });
      }
    }
    const result = await client.query(
      `insert into user_coupons(coupon_id,user_id,source,expires_at,created_by) values($1,$2,'ADMIN',$3,$4)
       returning id as user_coupon_id,coupon_id,status,source,issued_at,expires_at`,
      [coupon.id,id,expiresAt,request.actor!.userId],
    );
    await client.query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json) values($1,'COUPON_ISSUED','user_coupon',$2,$3,$4)", [request.actor!.userId,result.rows[0].user_coupon_id,request.id,{ customer_id: id, coupon_id: coupon.id }]);
    await client.query("commit");
    return reply.code(201).send({ data: { ...result.rows[0], code: coupon.code, name_en: coupon.name_en, name_zh: coupon.name_zh, discount_type: coupon.discount_type, discount_value: coupon.discount_value } });
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.post("/v1/admin/user-coupons/:id/revoke", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const { reason } = z.object({ reason: z.string().trim().min(3).max(240) }).parse(request.body);
  const result = await query(
    `update user_coupons set status='REVOKED',revoked_at=now(),revoked_by=$2,revoke_reason=$3
     where id=$1 and status='ISSUED' returning *`,
    [id,request.actor!.userId,reason],
  );
  if (!result.rowCount) return reply.code(409).send({ error: { code: "COUPON_NOT_REVOCABLE", message: "Only an unused coupon can be revoked" } });
  await query("insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json) values($1,'USER_COUPON_REVOKED','user_coupon',$2,$3,$4)", [request.actor!.userId,id,request.id,{ reason }]);
  return { data: result.rows[0] };
});

app.get("/v1/admin/stores", { preHandler: requireAdmin }, async () => {
  const result = await query(
    "select id,code,name,area,address,phone,lat::float,lng::float,timezone,status,pickup_enabled,delivery_enabled,location_verified,opening_hours_json,created_at,updated_at from stores order by name",
  );
  return { data: result.rows };
});

app.patch("/v1/admin/stores/:id", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const input = z.object({ name: z.string().trim().min(1).max(120).optional(), address: z.string().trim().min(3).max(240).optional(), phone: z.string().max(30).nullable().optional(), lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE", "COMING_SOON"]).optional(), pickup_enabled: z.boolean().optional(), delivery_enabled: z.boolean().optional(), location_verified: z.boolean().optional() }).parse(request.body);
  const result = await query(
    `update stores set name=coalesce($2,name),address=coalesce($3,address),phone=case when $4::boolean then $5 else phone end,
     lat=case when $6::boolean then $7 else lat end,lng=case when $8::boolean then $9 else lng end,status=coalesce($10,status),
     pickup_enabled=coalesce($11,pickup_enabled),delivery_enabled=coalesce($12,delivery_enabled),location_verified=coalesce($13,location_verified),updated_at=now()
     where id::text=$1 or code=$1 returning *`,
    [id, input.name ?? null, input.address ?? null, Object.hasOwn(input, "phone"), input.phone ?? null, Object.hasOwn(input, "lat"), input.lat ?? null, Object.hasOwn(input, "lng"), input.lng ?? null, input.status ?? null, input.pickup_enabled ?? null, input.delivery_enabled ?? null, input.location_verified ?? null],
  );
  if (!result.rowCount) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Store not found" } });
  await query(
    "insert into audit_logs(actor_id,action,entity_type,entity_id,request_id) values($1,'STORE_UPDATED','store',$2,$3)",
    [request.actor!.userId, result.rows[0].id, request.id],
  );
  return { data: result.rows[0] };
});

app.post("/v1/admin/fulfillments/:id/transition", { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = z.object({ to: z.enum(["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]), reason: z.string().max(200).optional() }).parse(request.body);
  const allowed: Record<string, string[]> = {
    PLACED: ["CONFIRMED", "PREPARING", "CANCELLED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  const client = await pool.connect();
  try {
    await client.query("begin");
    const current = await client.query("select status from fulfillment_groups where id=$1 for update", [id]);
    if (!current.rowCount) { await client.query("rollback"); return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Fulfillment not found" } }); }
    if (!allowed[current.rows[0].status]?.includes(input.to)) { await client.query("rollback"); return reply.code(409).send({ error: { code: "INVALID_TRANSITION", message: `Cannot move ${current.rows[0].status} to ${input.to}` } }); }
    const result = await client.query("update fulfillment_groups set status=$2 where id=$1 returning id,status", [id, input.to]);
    await client.query("insert into status_events(fulfillment_group_id,from_status,to_status,actor_id,reason) values($1,$2,$3,$4,$5)", [id, current.rows[0].status, input.to, request.actor!.userId, input.reason ?? null]);
    await client.query("commit");
    return { data: result.rows[0] };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.post("/v1/admin/pickups/verify", { preHandler: requireAdmin }, async (request, reply) => {
  const input = z.object({ token: z.string().min(20), store_id: z.string() }).parse(request.body);
  if (!verifyPickupSignature(input.token)) return reply.code(422).send({ error: { code: "TOKEN_INVALID", message: "Pickup code is invalid" } });
  const result = await query(
    `select o.order_number,f.id as fulfillment_id,f.status,pt.expires_at,pt.redeemed_at,s.code as store_code
     from pickup_tokens pt join fulfillment_groups f on f.id=pt.fulfillment_group_id join orders o on o.id=f.order_id join stores s on s.id=f.store_id
     where pt.token_hash=$1 and (s.id::text=$2 or s.code=$2)`,
    [hashPickupToken(input.token), input.store_id],
  );
  if (!result.rowCount) return reply.code(404).send({ error: { code: "TOKEN_NOT_FOUND", message: "Pickup code does not match this store" } });
  return { data: result.rows[0] };
});

app.post("/v1/admin/pickups/redeem", { preHandler: requireAdmin }, async (request, reply) => {
  const input = z.object({ token: z.string().min(20), store_id: z.string() }).parse(request.body);
  if (!verifyPickupSignature(input.token)) return reply.code(422).send({ error: { code: "TOKEN_INVALID", message: "Pickup code is invalid" } });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select pt.id,pt.fulfillment_group_id,pt.expires_at,pt.redeemed_at,s.id as store_id,o.order_number,f.status
       from pickup_tokens pt join fulfillment_groups f on f.id=pt.fulfillment_group_id join stores s on s.id=f.store_id join orders o on o.id=f.order_id
       where pt.token_hash=$1 and (s.id::text=$2 or s.code=$2) for update of pt,f`,
      [hashPickupToken(input.token), input.store_id],
    );
    const pickup = result.rows[0];
    if (!pickup) { await client.query("rollback"); return reply.code(404).send({ error: { code: "TOKEN_NOT_FOUND", message: "Pickup code does not match this store" } }); }
    if (pickup.redeemed_at) { await client.query("rollback"); return reply.code(409).send({ error: { code: "ALREADY_REDEEMED", message: "Pickup code has already been redeemed" } }); }
    if (new Date(pickup.expires_at).getTime() < Date.now()) { await client.query("rollback"); return reply.code(409).send({ error: { code: "TOKEN_EXPIRED", message: "Pickup code has expired" } }); }
    await client.query("update pickup_tokens set redeemed_at=now(),redeemed_by=$2,redeemed_store_id=$3 where id=$1", [pickup.id, request.actor!.userId, pickup.store_id]);
    await client.query("update fulfillment_groups set status='COMPLETED' where id=$1", [pickup.fulfillment_group_id]);
    await client.query("insert into status_events(fulfillment_group_id,from_status,to_status,actor_id,reason) values($1,$2,'COMPLETED',$3,'QR pickup redemption')", [pickup.fulfillment_group_id, pickup.status, request.actor!.userId]);
    await client.query("commit");
    return { data: { order_number: pickup.order_number, status: "COMPLETED", redeemed_at: new Date().toISOString() } };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
});

app.addHook("onClose", async () => { await pool.end(); });

await app.listen({ port: config.port, host: config.host });
