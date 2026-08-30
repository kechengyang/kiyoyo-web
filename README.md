# KIYOYO Commerce / KIYOYO 商城

KIYOYO is a bilingual commerce Web/PWA and store-operations console for Nairobi. / KIYOYO 是面向内罗毕的中英双语商城 Web/PWA 与门店运营后台。

This repository implements a static Next.js frontend, a Fastify API on Cloud Run, PostgreSQL on Cloud SQL, Firebase/Identity Platform authentication, private Cloud Storage media, Terraform infrastructure, and GitHub Actions CI/CD. / 当前仓库实现了静态 Next.js 前端、Cloud Run Fastify API、Cloud SQL PostgreSQL、Firebase/Identity Platform 身份认证、私有 Cloud Storage 图片、Terraform 基础设施及 GitHub Actions CI/CD。

## Current product / 当前产品

- Customer routes: `/`, `/shop`, `/cart`, `/account`; saved products appear inside Cart. / 顾客路由：`/`、`/shop`、`/cart`、`/account`；收藏商品展示在购物车内。
- Admin routes cover Orders, Redeem, Customers, Loyalty, Management, Overview, Products, Coupons, Stores, and Access. / Admin 路由覆盖订单、核销、顾客、积分、管理、概览、商品、优惠券、门店和权限。
- Membership is tied to a Firebase-verified phone; email verification is not a checkout gate. / 会员资格绑定 Firebase 已验证手机号；邮箱验证不是结账门禁。
- Checkout uses an explicitly labelled MOCK provider. No real charge is made. / 结账使用明确标识的 MOCK 支付通道，不会真实扣款。
- Loyalty defaults to a configurable 1% earn rate; one whole point deducts KSh 1. / 积分默认按可配置的 1% 比例获得；1 个整数积分抵扣 KSh 1。
- POSPAL currently supplies product catalogue data; paid-order push and status callbacks are not implemented. / POSPAL 当前提供商品目录数据；已支付订单推送与状态回调尚未实现。

Repository implementation is the documentation baseline. Deployment and authenticated live behaviour must be verified separately. / 仓库实现是文档基线；部署状态和登录后的线上行为必须另行验证。

## Local development / 本地开发

```bash
cd web
npm ci
npm run dev
```

Web: `http://localhost:3000`; Admin: `http://localhost:3000/admin`. / 顾客端：`http://localhost:3000`；管理端：`http://localhost:3000/admin`。

The API needs PostgreSQL, Firebase credentials, `DB_PASSWORD`, and `PICKUP_SIGNING_KEY`; see [local development](./docs/08-local-development.md). / API 需要 PostgreSQL、Firebase 凭据、`DB_PASSWORD` 和 `PICKUP_SIGNING_KEY`；详见[本地开发](./docs/08-local-development.md)。

## Verification / 验证

```bash
cd api && npm ci && npm run verify && npm run build
cd ../web && npm ci && npm run verify
cd ../infra/terraform && terraform fmt -check -recursive
```

`web/npm run build -- --webpack` creates the Firebase Hosting output in `web/out`; the vinext preview build is a separate local regression check. / `web/npm run build -- --webpack` 生成 Firebase Hosting 使用的 `web/out`；vinext preview build 是另一项本地回归检查。

## Repository map / 仓库结构

- `web/` — customer Web/PWA and Admin console / 顾客 Web/PWA 与 Admin 后台
- `api/` — Commerce API, migrations, seed, and POSPAL catalogue sync / 商城 API、迁移、种子数据与 POSPAL 商品同步
- `infra/terraform/` — `kiyoyo-{env}` GCP resources / `kiyoyo-{env}` GCP 资源
- `docs/` — bilingual product, architecture, API, data, security, operations, and integration documentation / 双语产品、架构、API、数据、安全、运维与集成文档
- `.codex/skills/` — project workflows, including mandatory documentation sync for medium and large changes / 项目工作流，包括中大型改动必须同步文档

Start with the [documentation index](./docs/README.md). / 请从[文档索引](./docs/README.md)开始。
