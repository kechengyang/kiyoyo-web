# 01 · Product and current scope / 产品与当前范围

## Product position / 产品定位

KIYOYO combines drinks, goods, store fulfilment, membership, coupons, and loyalty in one bilingual Nairobi commerce experience. / KIYOYO 将饮品、商品、门店履约、会员、优惠券与积分整合为一个面向内罗毕的双语商城体验。

Web/PWA is the current delivery channel. Native apps, real payment, and automated delivery logistics remain outside the implemented scope. / Web/PWA 是当前交付渠道；原生 App、真实支付和自动配送物流仍不在已实现范围内。

## Roles / 用户角色

| Role / 角色 | Current capability / 当前能力 |
|---|---|
| Guest / 游客 | Browse, search, select a store, and maintain a device cart and saved list. / 浏览、搜索、选店，并维护本地购物车与收藏。 |
| Member / 会员 | Verified-phone checkout, cloud favourites, addresses, coupons, loyalty, orders, and pickup-token reissue. / 手机号验证后结账、云端收藏、地址、优惠券、积分、订单和取餐码重发。 |
| Operator / 门店运营 | Assigned-store orders/transitions and pickup redemption; global customer read; loyalty/store-context read. / 指定门店订单/状态推进与取餐核销；全局顾客只读；积分/门店上下文只读。 |
| Admin / 管理员 | All operations plus global configuration, writes, staff access, audit, and POSPAL sync. / 所有运营操作，以及全局配置、写入、员工权限、审计与 POSPAL 同步。 |

## Customer experience / 顾客体验

- Home presents store context, campaigns, drinks, and goods. / Home 展示门店语境、活动、饮品与商品。
- Shop separates Drink Studio from KIYOYO Goods and supports search, categories, detail, size, taste, ice, and add-ons. / Shop 区分 Drink Studio 与 KIYOYO Goods，支持搜索、分类、详情、杯型、甜度、冰量和加料。
- Cart is the single checkout surface and includes a horizontal saved-products shelf. / Cart 是唯一结账入口，并包含横向收藏商品区。
- Account contains profile, membership state, addresses, coupon wallet, loyalty history, orders, and provider controls. / Account 包含资料、会员状态、地址、优惠券钱包、积分记录、订单和登录方式管理。
- `/`, `/shop`, `/cart`, and `/account` are refresh-safe static routes. / `/`、`/shop`、`/cart` 与 `/account` 均为刷新安全的静态路由。

The interface preserves English/Chinese copy and language choice locally. Final price, discount, availability, points, and fulfilment legality are always recalculated by the API. / 界面保留中英文文案并在本地保存语言选择；最终价格、折扣、可用性、积分和履约合法性始终由 API 重新计算。

## Membership and authentication / 会员与身份认证

- Supported customer providers are email/password and Google. Facebook is not part of the current trusted provider type. / 当前顾客登录支持邮箱密码与 Google；Facebook 不在当前可信 provider 类型中。
- A signed-in account may remain incomplete; checkout requires a Firebase-verified phone. / 已登录账号可以处于资料未完成状态；结账必须拥有 Firebase 已验证手机号。
- Email verification is metadata, not a membership or checkout gate. / 邮箱验证是身份元数据，不是会员或结账门禁。
- One E.164 phone can belong to only one member. Delivery/profile phone fields are not authentication evidence. / 一个 E.164 手机号只能属于一个会员；配送/资料手机号不是认证证据。
- Password reset and provider linking use Firebase; the application database never stores customer passwords. / 密码重置与 provider 绑定使用 Firebase；应用数据库不保存顾客密码。

## Commerce / 商城

- Products are `DRINK` or `GOODS`, with bilingual content, categories, prices, discounts, tags, active state, images, sizes, and POSPAL attributes. / 商品分为 `DRINK` 与 `GOODS`，支持双语内容、分类、价格、折扣、标签、上下架、图片、杯型与 POSPAL 属性。
- Checkout supports `PICKUP`, `DELIVERY`, and `SHIPPING`; the current request creates one fulfilment group. / 结账支持 `PICKUP`、`DELIVERY` 与 `SHIPPING`；当前请求创建一个履约组。
- Payment is `MOCK` with `test_ok`, `test_declined`, and `test_timeout`. / 支付为 `MOCK`，支持 `test_ok`、`test_declined` 与 `test_timeout`。
- Checkout requires `Idempotency-Key`; orders and payments persist transactionally. / 结账必须提供 `Idempotency-Key`；订单与支付在事务中持久化。
- Fulfilment states are `PLACED → CONFIRMED/PREPARING → READY → COMPLETED`, with legal cancellation branches. / 履约状态为 `PLACED → CONFIRMED/PREPARING → READY → COMPLETED`，并包含合法取消分支。
- Pickup tokens are signed, hashed at rest, store-scoped, expiring, single-use, and owner-reissuable. / 取餐 token 经过签名、静态只存哈希、限定门店、具有过期时间、只能使用一次且订单所有者可重发。

## Coupons and loyalty / 优惠券与积分

- Coupon lifecycle is `DRAFT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `ENDED`, `ARCHIVED`; issuance and redemption switches are independent. / 优惠券生命周期为 `DRAFT`、`SCHEDULED`、`ACTIVE`、`PAUSED`、`ENDED`、`ARCHIVED`；发放与核销开关相互独立。
- Coupon pricing is server-side and supports percent, fixed, and free-size-upgrade rules with scope, time, fulfilment, and limit checks. / 优惠券由服务端计价，支持百分比、固定额和免费升杯，并校验范围、时间、履约与次数限制。
- Loyalty uses whole points. Default earn rate is 1%, rounded down; one point deducts KSh 1. / 积分使用整数；默认获得比例为 1% 并向下取整；1 积分抵扣 KSh 1。
- Points mutate only for immediate `PAID` checkout; manual Admin adjustment requires reason, idempotency, audit, and sufficient balance. / 积分只在结账立即为 `PAID` 时变动；Admin 手工调整必须提供原因、幂等、审计且余额充足。
- Loyalty ledger rows are immutable except explicit deletion of marked test data. / 积分账本不可修改，只有明确标记的测试数据允许删除。

## Admin experience / 管理端体验

- Admin opens on a task-oriented Home; every section has a direct URL. / Admin 登录后进入任务导向 Home；每个模块都有直接 URL。
- Orders update through authenticated, server-store-scoped SSE with reconnect/refresh state and optional audio alerts. / 订单通过已认证、服务端门店限定的 SSE 更新，并提供重连/刷新状态和可选声音提醒。
- Products, coupons, customers, loyalty, stores, access accounts, and audit records have server-authorized operations. / 商品、优惠券、顾客、积分、门店、权限账号与审计记录均由服务端授权。
- POSPAL-linked products take catalogue fields from POSPAL unless an Admin enables manual override. / POSPAL 已关联商品默认从 POSPAL 获取目录字段，除非 Admin 开启手工覆盖。

## Acceptance boundary / 验收边界

Source and automated tests prove repository behaviour only. They do not prove current DNS, provider-console configuration, deployed revision, migration state, or authenticated live UX. / 源码与自动化测试只证明仓库行为，不能证明当前 DNS、provider 控制台配置、已部署 revision、迁移状态或登录后的线上 UX。

Not implemented: real payment/refund automation, courier dispatch/live tracking, POSPAL paid-order push/callback, production-grade inventory reservation, native apps, and multi-warehouse supply chain. / 尚未实现：真实支付/自动退款、骑手派单/实时追踪、POSPAL 已支付订单推送/回调、生产级库存预留、原生 App 与多仓供应链。
