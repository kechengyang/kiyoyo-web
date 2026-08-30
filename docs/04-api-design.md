# 04 · API design and endpoint inventory / API 设计与端点清单

The Fastify service exposes JSON under `/v1`, plus health/readiness and SSE. Authentication uses `Authorization: Bearer <Firebase ID token>`. Errors use `{ "error": { "code", "message" } }`. / Fastify 服务在 `/v1` 下提供 JSON，并提供健康、就绪与 SSE；认证使用 `Authorization: Bearer <Firebase ID token>`；错误格式为 `{ "error": { "code", "message" } }`。

## Conventions / 约定

- `Idempotency-Key` is mandatory for checkout and manual point adjustment. / 结账与手工积分调整必须提供 `Idempotency-Key`。
- Current amounts are integer KES. / 当前金额为整数 KES。
- Pagination is not uniform; current Admin lists use bounded results. / 分页尚未统一；当前 Admin 列表使用有上限的结果。
- No OpenAPI file is published; route schemas and contract tests are authoritative. / 尚未发布 OpenAPI 文件；路由 schema 与契约测试具有权威性。

## Public catalogue / 公开目录

| Method / 方法 | Path / 路径 | Purpose / 用途 |
|---|---|---|
| `GET` | `/healthz`, `/health`, `/readyz` | Health and database readiness / 健康与数据库就绪 |
| `GET` | `/v1/app-config` | Client-safe config / 客户端安全配置 |
| `GET` | `/v1/stores`, `/v1/stores/:id` | Stores / 门店 |
| `GET` | `/v1/products`, `/v1/products/:slug`, `/v1/search` | Active catalogue and search / 已上架目录与搜索 |
| `GET` | `/v1/media/:encodedKey` | Proxy approved private media / 代理已批准私有图片 |

## Customer / 顾客

| Method / 方法 | Path / 路径 | Purpose / 用途 |
|---|---|---|
| `POST` | `/v1/auth/bootstrap` | Project trusted Firebase identity into KIYOYO / 映射可信 Firebase 身份 |
| `GET`, `PATCH` | `/v1/me` | Profile and membership / 资料与会员状态 |
| `GET` | `/v1/me/loyalty` | Wallet, rate, ledger / 钱包、比例、账本 |
| `GET`, `POST` | `/v1/me/addresses` | List/create addresses / 列表/创建地址 |
| `PATCH`, `DELETE`, `PUT` | `/v1/me/addresses/:id`, `/:id/default` | Update/delete/default / 更新/删除/默认地址 |
| `GET`, `PUT`, `DELETE` | `/v1/me/favorites`, `/:productId` | Cloud favourites / 云端收藏 |
| `GET` | `/v1/me/coupons` | Coupon wallet / 优惠券钱包 |
| `POST` | `/v1/checkouts` | Pricing, coupon, points, MOCK payment, order / 计价、优惠券、积分、MOCK 支付、订单 |
| `GET` | `/v1/me/orders` | Order history / 订单历史 |
| `POST` | `/v1/me/orders/:orderNumber/pickup-token` | Owner token rotation / 所有者重发 token |

All `/v1/me*` routes require a profile; checkout additionally requires verified phone membership. / 所有 `/v1/me*` 路由需要有效资料；结账还需要已验证手机号会员资格。

## Admin operations / Admin 操作

| Area / 领域 | Endpoints / 端点 |
|---|---|
| Session / 会话 | `GET /v1/admin/session`, `/context/stores`, `/overview` |
| Orders / 订单 | `GET /order-alerts`, SSE `/order-events`, `GET /orders`, fulfilment transition / 履约推进 |
| Pickup / 取餐 | `POST /pickups/verify`, `/pickups/redeem` |
| Products / 商品 | list/create/update, media upload/confirm, tag CRUD / 列表/创建/更新、图片上传/确认、标签 CRUD |
| Coupons / 优惠券 | list/create/update, publish, stop distribution, disable, archive / 列表/创建/更新、发布、停止发放、禁用、归档 |
| Customers / 顾客 | list/detail/update, issue/revoke coupon / 列表/详情/更新、发放/撤销优惠券 |
| Loyalty / 积分 | settings read/update, customer adjustment / 设置读取/更新、顾客调整 |
| Stores / 门店 | Admin list/update, including POSPAL mapping / Admin 列表/更新，包括 POSPAL 映射 |
| Access / 权限 | staff list/create/update/remove/restore/password, audit logs / 员工列表/创建/更新/移除/恢复/密码、审计日志 |
| POSPAL / 银豹 | `POST /pospal/product-sync`, `GET /pospal/product-sync/status` |

Every write is permission-gated. Store operations are scoped server-side; high-risk staff access/password operations require recent Admin auth. / 每项写操作都有权限门禁；门店操作由服务端限定范围；高风险员工权限/密码操作要求近期 Admin 认证。

SSE emits `created` and `status-changed` after server-side filtering. Clients reconnect and refresh authoritative lists after reconnect. / SSE 在服务端过滤后发送 `created` 与 `status-changed`；客户端重连后刷新权威列表。

There is no implemented POSPAL order-push, callback, polling, or internal task endpoint. / 当前没有已实现的 POSPAL 订单推送、回调、轮询或内部 task 端点。
