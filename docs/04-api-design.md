# 04 · API 设计

基础路径：`/v1`；JSON；UTF-8。认证使用 Identity Platform JWT，Admin API 同时校验角色和门店范围。

## 约定

- 请求头：`Authorization: Bearer …`、`X-Request-Id`、`Accept-Language: en|zh`。
- 创建订单、支付、核销使用 `Idempotency-Key`。
- 分页：cursor，不用易漂移的 offset；返回 `next_cursor`。
- 错误格式：`{ "error": { "code", "message", "request_id", "details" } }`。
- 常见状态：400 参数、401 未登录、403 越权、404 不存在、409 状态冲突/重复核销、422 业务规则、429 限流。

## Public / Customer API

### 配置与门店

- `GET /v1/app-config?locale=en`
- `GET /v1/stores?lat=-1.28&lng=36.81` — 可选服务端排序；浏览器也可本地排序。
- `GET /v1/stores/{storeId}`
- `GET /v1/stores/{storeId}/menu?kind=DRINK&category=milk-tea`

### 商品

- `GET /v1/products?kind=GOODS&category=fashion&cursor=...`
- `GET /v1/products/{slug}`
- `GET /v1/search?q=matcha&store_id=...`

### 收藏与账户

- `POST /v1/auth/bootstrap` — 客户端完成 Identity Platform 登录后，用 ID token 创建/加载 KIYOYO 用户。
- `GET /v1/me`、`PATCH /v1/me`
- `GET /v1/me/addresses`
- `POST /v1/me/addresses`
- `PATCH /v1/me/addresses/{addressId}`
- `DELETE /v1/me/addresses/{addressId}`
- `PUT /v1/me/addresses/{addressId}/default`
- `GET /v1/me/favorites`
- `PUT /v1/me/favorites/{productId}`、`DELETE /v1/me/favorites/{productId}`
- `GET /v1/me/loyalty`
- `GET /v1/me/coupons`
- `GET /v1/me/orders` — 返回订单金额、履约状态、商品快照、门店、地址快照与取餐码状态；
  登录后用于跨设备同步 History。
- `POST /v1/me/orders/{orderNumber}/pickup-token` — 仅订单本人可重新签发自取二维码。
  服务端只持有 token hash；重新签发会原子替换 hash，旧二维码立即失效。已核销、已完成
  或已取消订单不能重新签发。

### Cart 与报价

- `POST /v1/carts` — 建立 guest/member cart。
- `PUT /v1/carts/{cartId}/store` — 切换店并返回不可售项。
- `POST /v1/carts/{cartId}/items`
- `PATCH /v1/carts/{cartId}/items/{itemId}`
- `DELETE /v1/carts/{cartId}/items/{itemId}`
- `POST /v1/carts/{cartId}/quote` — 服务端重算价格、优惠、配送费和过期时间。

### Checkout

`POST /v1/checkouts`

```json
{
  "cart_id": "uuid",
  "quote_id": "uuid",
  "fulfillment": {
    "drink": { "type": "PICKUP", "store_id": "uuid" },
    "goods": { "type": "SHIPPING", "address_id": "uuid" }
  },
  "coupon_code": "HAPPY20",
  "payment_method": { "provider": "MOCK", "token": "test_ok" }
}
```

响应返回订单、支付状态、分组履约状态。只有自取组返回 `pickup_qr_payload`；二维码不暴露数据库 ID。
首次下单的原始 token 只返回一次。若换设备后需要再次展示，必须调用上述本人授权的
重新签发接口，不能把明文取餐 token 长期保存在数据库。

- `GET /v1/orders/{orderNumber}`
- `POST /v1/orders/{orderNumber}/cancel`
- `PATCH /v1/orders/{orderNumber}/delivery-address` — 仅允许可编辑状态，服务端重新校验配送范围并写地址变更事件。

地址请求不接受 `is_default` 作为无条件覆盖；设置默认地址要在事务中确保每个用户最多一个默认项。订单使用独立地址快照，修改地址簿不会改写已有订单。

## Admin API

- `GET /v1/admin/orders?store_id=...&status=READY&cursor=...`
- `GET /v1/admin/orders/{orderNumber}`
- `POST /v1/admin/fulfillments/{id}/transition` body `{ "to": "PREPARING" }`
- `POST /v1/admin/pickups/verify` — 只验证，不改变状态；可选。
- `POST /v1/admin/pickups/redeem` — 原子核销。
- `GET /v1/admin/customers?query=...`
- `GET /v1/admin/customers/{id}`
- `GET /v1/admin/coupons`、`POST /v1/admin/coupons`、`PATCH /v1/admin/coupons/{id}` — 草稿列表、创建和规则编辑；已产生核销的规则不可直接修改。
- `POST /v1/admin/coupons/{id}/publish` — 根据开始时间进入 `SCHEDULED` 或 `ACTIVE`，同时开启发放和使用。
- `POST /v1/admin/coupons/{id}/stop-distribution` — 只停止新发放，保留已发券的使用权。
- `POST /v1/admin/coupons/{id}/disable` — 紧急停止所有使用，body 必须包含 `reason`。
- `POST /v1/admin/coupons/{id}/archive` — 归档并关闭发放、使用。
- `POST /v1/admin/customers/{id}/coupons` — 向单个有效客户发放已发布的 `ASSIGNED` Coupon。
- `POST /v1/admin/user-coupons/{id}/revoke` — 撤销未使用用户券，body 必须包含 `reason`。
- `POST /v1/admin/loyalty/adjustments` — 管理员，强制 reason。
- `GET /v1/admin/stores`、`PATCH /v1/admin/stores/{id}`
- `GET /v1/admin/products?kind=DRINK&status=ACTIVE&query=...`
- `POST /v1/admin/products` — 创建不可见商品草稿；上传并确认 GCS 图片后才能发布。
- `PATCH /v1/admin/products/{id}` — 名称、基础价、折扣和上架状态；要求 `If-Match`/version 防止覆盖他人修改。
- `GET /v1/admin/product-tags`、`POST /v1/admin/product-tags` — 查询或创建可复用商品标签。
- `PATCH /v1/admin/product-tags/{id}`、`DELETE /v1/admin/product-tags/{id}` — 修改或归档标签；归档时事务性解除商品关联。
- `PATCH /v1/admin/products/{id}` 可提交 `tag_id`；服务端验证标签仍为 active，客户端不能提交任意标签文字或颜色。
- `POST /v1/admin/products/{id}/media-upload` — 返回 Cloud Storage 短期 signed upload URL。
- `POST /v1/admin/products/{id}/media-confirm` — 确认上传并启动校验/缩略图处理。
- `GET /v1/admin/audit-logs?...` — 管理员只读。

商品更新响应返回新的 `catalog_version`、`effective_price` 和媒体状态。前端目录接口返回 `ETag`；客户端版本过期时重新获取。`active=false` 或媒体仍在 PROCESSING 的产品不可进入新订单。

核销请求：

```json
{
  "token": "opaque-one-time-token",
  "store_id": "uuid",
  "device_time": "2026-08-04T14:03:22+03:00"
}
```

服务端以数据库时间和员工 token 内的门店权限为准，不信任 `device_time` 或客户端状态。

## Payment Provider Interface

```ts
interface PaymentProvider {
  authorize(input: AuthorizeInput): Promise<PaymentResult>;
  capture(input: CaptureInput): Promise<PaymentResult>;
  refund(input: RefundInput): Promise<PaymentResult>;
  verifyWebhook(headers: Headers, rawBody: Buffer): ProviderEvent;
}
```

`MockPaymentProvider` 接受明确测试 token：`test_ok`、`test_declined`、`test_timeout`，让 QA 覆盖成功、拒绝和超时。真实 M-Pesa/银行卡适配器只替换 provider，不改变订单服务。

## OpenAPI 与契约

- 后端生成 `/openapi.json`，前端通过 CI 生成 typed client。
- CI 检测 breaking change；兼容变更只能新增可选字段。
- 对 Checkout、状态机、核销和权限做 consumer contract tests。
