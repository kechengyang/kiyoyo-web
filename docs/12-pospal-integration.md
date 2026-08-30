# 12 · POSPAL integration / 银豹 POSPAL 集成

## Current status / 当前状态

Implemented: signed POSPAL client, product/category/taste dictionary reads, Admin-triggered catalogue sync, barcode alignment, source-field updates/inserts, large-size variant merge, manual override, store account fields, sync status, and regression tests. / 已实现：POSPAL 签名客户端、商品/分类/口味字典读取、Admin 触发目录同步、条码对齐、来源字段更新/插入、大杯变体合并、手工覆盖、门店账号字段、同步状态与回归测试。

Not implemented: paid-order `product-order/create`, transactional outbox, Cloud Tasks worker, callback endpoint, sale-ticket polling, or POSPAL-to-KIYOYO fulfilment updates. / 尚未实现：已支付订单 `product-order/create`、transactional outbox、Cloud Tasks worker、回调端点、销售小票轮询或 POSPAL 到 KIYOYO 的履约更新。

Do not use product-sync success, POSPAL order lookup experiments, or the existence of provisioned queues as evidence that KIYOYO orders are uploaded. / 不得把商品同步成功、POSPAL 订单查询实验或已配置队列的存在当作 KIYOYO 订单已上传的证据。

## Authentication and client / 认证与客户端

The client sends `appId`, `requestId`, `timestamp`, and uppercase MD5 signature derived from `appId + requestId + timestamp + appKey` according to the currently implemented POSPAL contract. POSPAL IDs are always strings because they may exceed JavaScript safe integer range. / 客户端按当前实现的 POSPAL 契约发送 `appId`、`requestId`、`timestamp` 与由 `appId + requestId + timestamp + appKey` 派生的大写 MD5 签名；POSPAL ID 始终使用字符串，因为它们可能超过 JavaScript 安全整数范围。

Configuration: / 配置：

```dotenv
POSPAL_APP_ID=...
POSPAL_APP_KEY=...
POSPAL_BASE_URL=https://platform.pospal.cn
POSPAL_HQ_ACCOUNT=...
POSPAL_TIMEOUT_MS=10000
```

Missing configuration makes only POSPAL Admin endpoints fail explicitly; API startup and database migrations remain available. Credentials must stay in protected runtime configuration and never enter source/logs/docs. / 缺少配置只会使 POSPAL Admin 端点明确失败；API 启动与数据库迁移仍可用；凭据必须留在受保护运行时配置，绝不能进入源码、日志或文档。

## Implemented catalogue flow / 已实现目录流程

```mermaid
sequenceDiagram
  participant A as Admin
  participant K as KIYOYO API
  participant P as POSPAL API
  participant D as PostgreSQL
  A->>K: POST /v1/admin/pospal/product-sync
  K->>P: category/list + taste/list
  K->>D: upsert source dictionaries
  loop product dictionary pages
    K->>P: product/list with cursor
    K->>K: normalize, dedupe barcode, merge -1 size
    K->>D: update unlocked matches; insert new source products
    K->>D: upsert mapping and cursor
  end
  K-->>A: counts and price/name/category diffs
```

Only `ADMIN` has `pospal.manage`. The endpoint is synchronous; current code does not schedule automatic periodic sync. / 只有 `ADMIN` 拥有 `pospal.manage`；端点同步执行；当前代码不会安排自动周期同步。

## Source-of-truth rules / 事实来源规则

- `products.pospal_barcode` is the alignment key; POSPAL UID remains a string source identifier. / `products.pospal_barcode` 是对齐 key；POSPAL UID 保持字符串来源标识。
- POSPAL-linked, unlocked products receive source name, price, category, UID, tastes, images, and no-stock fields. / 已关联且未锁定商品从 POSPAL 接收名称、价格、分类、UID、口味、图片与不记库存字段。
- Web-specific fields such as Chinese copy, discount, active state, display tag, and manual override remain KIYOYO-managed. / 中文文案、折扣、上下架、展示标签与手工覆盖等 Web 专属字段仍由 KIYOYO 管理。
- `pospal_manual_override=true` prevents sync from overwriting the linked product; use it only for reviewed exceptions. / `pospal_manual_override=true` 阻止同步覆盖已关联商品；只应用于经审查的例外。
- Duplicate source barcodes keep the first normalized row; rows without a usable barcode are not aligned as normal products. / 重复来源条码保留首个规范化行；没有可用条码的行不会作为普通商品对齐。
- Barcode suffix `-1` is treated as an L-size variant and written to the base product's `size_prices_json.L`. / 条码后缀 `-1` 视为 L 杯变体，并写入主商品 `size_prices_json.L`。
- POSPAL images/tastes remain JSON source snapshots; customer mapping selects cover/path and taste package data. / POSPAL 图片/口味保留为 JSON 来源快照；顾客端映射选择封面/path 与口味包数据。

## Data model / 数据模型

| Table/field / 表或字段 | Purpose / 用途 |
|---|---|
| `pospal_product_mappings` | POSPAL dictionary row, barcode, source price/name, KIYOYO link, status / POSPAL 字典行、条码、来源价格/名称、KIYOYO 关联、状态 |
| `pospal_sync_state` | Cursor and last sync metadata by account scope / 按账号 scope 保存游标与最近同步元数据 |
| `pospal_categories` | Source category plus derived Web slug/kind / 来源分类与派生 Web slug/kind |
| `pospal_taste_options` | Source taste package/options / 来源口味包/选项 |
| `stores.pospal_account`, `pospal_enabled` | Store-to-POSPAL account configuration / 门店到 POSPAL 账号配置 |
| Product POSPAL fields | UID, barcode, category UID, tastes, images, no-stock, manual override / UID、条码、分类 UID、口味、图片、不记库存、手工覆盖 |

Migrations `0005` through `0010` establish mapping, barcode alignment, catalogue fields, full-resync corrections, override, and size-variant deduplication. Applied migrations must never be rewritten. / `0005` 到 `0010` 建立映射、条码对齐、目录字段、全量重同步修正、覆盖与杯型变体去重；已执行迁移不得改写。

## Admin operations / Admin 操作

- `POST /v1/admin/pospal/product-sync`: run catalogue sync and return summary/diffs. / 运行目录同步并返回摘要/差异。
- `GET /v1/admin/pospal/product-sync/status`: counts for products, matches, unmatched rows, source dictionaries, POSPAL-linked products, and last sync. / 返回商品、匹配、未匹配、来源字典、POSPAL 已关联商品与最近同步数量。
- Product editor shows POSPAL link/barcode/source state and allows explicit manual override. / 商品编辑器显示 POSPAL 关联/条码/来源状态，并允许明确手工覆盖。
- Store editor manages POSPAL account and enabled state. / 门店编辑器管理 POSPAL 账号与启用状态。

## Error and verification rules / 错误与验证规则

Network errors, 5xx, non-JSON gateway responses, and POSPAL transient codes are marked retryable by the client; business/auth/signature errors are not blindly retried. The synchronous Admin route currently leaves retry decisions to the caller/operator. / 网络错误、5xx、非 JSON gateway 响应与 POSPAL 瞬时错误码由客户端标记为可重试；业务/认证/签名错误不能盲目重试；当前同步 Admin 路由由调用者/运营决定重试。

Required checks include signature headers, response/error parsing, long string IDs, category/taste/product normalization, category mapping, duplicate barcode handling, `-1` merge, cursor pagination, source upsert/match, manual override, status counts, and customer/Admin field mapping. / 必需检查包括签名 header、响应/错误解析、长字符串 ID、分类/口味/商品规范化、分类映射、重复条码处理、`-1` 合并、游标分页、来源 upsert/匹配、手工覆盖、状态数量及顾客/Admin 字段映射。

Any real POSPAL write or production-data experiment requires explicit target confirmation, an inspectable test order, documented `orderNo`/`daySeq` semantics, and cleanup/reconciliation steps. POSPAL net-order status and sale-ticket upload state are different concepts. / 任何真实 POSPAL 写入或生产数据实验都要求明确确认目标、可检查测试订单、记录 `orderNo`/`daySeq` 语义及清理/对账步骤；POSPAL 网单状态与销售小票上传状态是不同概念。

## Planned order integration / 规划中的订单集成

A future reviewed design may use a transactional outbox plus authenticated Cloud Tasks worker to call POSPAL `product-order/create`, with KIYOYO order number as the idempotent external reference and store mapping validation. Callback/polling must verify signatures, preserve separate net-order versus ticket semantics, and never advance KIYOYO fulfilment without an explicit mapping. / 未来经审查的设计可使用 transactional outbox 与已认证 Cloud Tasks worker 调用 POSPAL `product-order/create`，以 KIYOYO 订单号作为幂等外部引用，并校验门店映射；回调/轮询必须校验签名、保持网单与小票语义分离，且不得在没有明确映射时推进 KIYOYO 履约。

Planned identifier contract: / 规划中的标识符契约：

- `orderNo` is the caller-supplied net-order identifier and must always be the globally unique KIYOYO `orders.order_number`; retries reuse the same value. / `orderNo` 是调用方提供的网单标识，必须始终使用全局唯一的 KIYOYO `orders.order_number`；重试复用同一值。
- `daySeq` is the POSPAL/store daily sequence returned for operations and pickup display. Store it separately; never substitute it for `orderNo` or derive one from the other. / `daySeq` 是 POSPAL/门店返回的当日流水号，用于运营与取餐展示；必须单独保存，不能替代 `orderNo`，也不能相互推导。
- Net-order creation/query and sale-ticket upload/query are distinct POSPAL domains. A ticket field such as `isReceived` or a UI label such as “Not uploaded” does not by itself prove that `product-order/create` failed. / 网单创建/查询与销售小票上传/查询是 POSPAL 的不同领域；小票字段如 `isReceived` 或 UI 的 “Not uploaded” 不能单独证明 `product-order/create` 失败。
- Before implementing, re-check the official V3 contract and a controlled store test for duplicate `orderNo`, returned `daySeq`, currency/amount units, item price override, and callback state semantics. / 实现前必须按官方 V3 契约与受控门店测试重新核对重复 `orderNo`、返回 `daySeq`、币种/金额单位、商品价格覆盖与回调状态语义。

This section is planned only and grants no authority to send live orders. / 本节仅为规划，不授予发送真实订单的权限。
