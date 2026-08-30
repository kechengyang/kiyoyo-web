# 09 · Refactor status and boundaries / 重构状态与边界

This document records the current modularization boundary and remaining debt. It is not a promise that every planned phase is shipped. / 本文记录当前模块化边界与剩余技术债，不代表每个规划阶段都已上线。

## Completed structure / 已完成结构

### Customer Web / 顾客 Web

Customer views are grouped under `web/app/components/customer/`: `core`, `shared`, `shell`, `home`, `shop`, `saved`, `cart`, `account`, `orders`, and `fulfillment`. / 顾客视图按 `core`、`shared`、`shell`、`home`、`shop`、`saved`、`cart`、`account`、`orders` 与 `fulfillment` 归类于 `web/app/components/customer/`。

Authentication is a separate domain under `web/app/auth/`. `KiyoyoApp.tsx` remains the composition root for data loading, state, dialogs, and writes. / 认证是 `web/app/auth/` 下的独立领域；`KiyoyoApp.tsx` 仍是数据加载、状态、dialog 与写入的 composition root。

Saved products are no longer a navigation destination; `SavedShelf` is rendered inside Cart. Customer routes are `/`, `/shop`, `/cart`, and `/account`. / 收藏不再是导航目的页；`SavedShelf` 渲染在 Cart 内；顾客路由为 `/`、`/shop`、`/cart` 与 `/account`。

### Admin Web structure / Admin Web 结构

Admin domains are `core`, `shared`, `shell`, `home`, `orders`, `redeem`, `customers`, `loyalty`, `management`, `overview`, `products`, `coupons`, `stores`, and `access`. / Admin 领域为 `core`、`shared`、`shell`、`home`、`orders`、`redeem`、`customers`、`loyalty`、`management`、`overview`、`products`、`coupons`、`stores` 与 `access`。

`AdminApp.tsx` remains the composition root. Routes are mapped in `admin/core/routes.ts`; role-based navigation is assembled from server session permissions. / `AdminApp.tsx` 仍是 composition root；路由在 `admin/core/routes.ts` 映射；基于角色的导航由服务端 session 权限组装。

### API structure / API 结构

Auth, Admin access/session, permissions, loyalty calculations, PostgreSQL order events, and POSPAL product sync have dedicated modules. Core catalogue, checkout, coupon, customer, store, order, and redemption routes still share `api/src/server.ts`. / 认证、Admin 权限/会话、permission、积分计算、PostgreSQL 订单事件与 POSPAL 商品同步已有独立模块；核心目录、结账、优惠券、顾客、门店、订单与核销路由仍集中在 `api/src/server.ts`。

## Behaviour contracts / 行为契约

Refactors must preserve: / 重构必须保留：

- English/Chinese copy and stored language choice. / 中英文文案与持久化语言选择。
- Refresh-safe customer/Admin URLs and browser history. / 顾客/Admin 刷新安全 URL 与浏览器历史。
- Guest cart/saved state and safe member ownership transfer. / 游客购物车/收藏状态与安全会员归属转移。
- Firebase provider flows, verified-phone membership, return-to-checkout continuity, and generic password-reset responses. / Firebase provider 流程、手机号会员、返回结账连续性与通用密码重置响应。
- Server-authoritative pricing, coupons, points, store scope, RBAC, state transitions, and pickup tokens. / 服务端权威计价、优惠券、积分、门店范围、RBAC、状态推进与取餐 token。
- POSPAL barcode/string-ID handling, category mapping, size-variant merge, source fields, and manual override. / POSPAL 条码/字符串 ID、分类映射、杯型变体合并、来源字段与手工覆盖。
- SSE true push, reconnect behaviour, audio opt-in, accessibility, and manual refresh. / SSE 真实推送、重连、声音 opt-in、可访问性与手工刷新。
- MOCK payment and `is_test` semantics until a reviewed real-payment replacement exists. / 在经审查的真实支付替代方案出现前，保留 MOCK 支付与 `is_test` 语义。

## Remaining debt / 剩余技术债

| Debt / 技术债 | Direction / 方向 | Constraint / 约束 |
|---|---|---|
| Large composition roots / 大型 composition root | Extract API clients/hooks/services and route modules incrementally. / 逐步提取 API client/hook/service 与路由模块。 | Preserve behaviour and tests per extraction. / 每次提取保留行为与测试。 |
| `server.ts` route concentration / `server.ts` 路由集中 | Move catalogue, checkout, coupons, customers, orders, stores, and redemption into domain modules. / 把相应领域迁入模块。 | Keep transactions and middleware ordering intact. / 保持事务与 middleware 顺序。 |
| Repeated DTO mapping / 重复 DTO 映射 | Introduce typed shared adapters without leaking DB rows to Web. / 引入 typed shared adapter，不向 Web 泄漏 DB row。 | API response compatibility first. / 优先保证 API 响应兼容。 |
| CSS scale / CSS 规模 | Split by stable layers/domains after visual regression coverage improves. / 在视觉回归覆盖提高后按稳定层/领域拆分。 | Preserve responsive and accessible interaction targets. / 保留响应式与可访问交互目标。 |
| Async placeholders / 异步占位 | Implement outbox/task workers only with explicit contracts and observability. / 只有在明确契约与可观测性下实现 outbox/task worker。 | Do not describe provisioned queues as working flows. / 不把已配置队列描述成已工作流程。 |

## Refactor verification / 重构验证

Run `sh scripts/verify-refactor.sh`, focused contract tests, API verification/build, Web `npm run verify`, route rendering, and responsive browser checks for affected surfaces. / 运行 `sh scripts/verify-refactor.sh`、针对性契约测试、API verify/build、Web `npm run verify`、路由渲染与受影响页面的响应式浏览器检查。

Medium or large refactors must update the relevant bilingual architecture, API, data, security, testing, and domain design documents in the same PR. / 中大型重构必须在同一 PR 同步更新相关双语架构、API、数据、安全、测试与领域设计文档。
