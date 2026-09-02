# KIYOYO Web / KIYOYO Web 前端

One Next.js App Router project provides the bilingual customer Web/PWA and Admin console as a static export for Firebase Hosting. / 一个 Next.js App Router 项目以 Firebase Hosting 静态导出形式提供双语顾客 Web/PWA 与 Admin 后台。

## Routes / 路由

- Customer: `/`, `/shop`, `/cart`, `/account`. / 顾客端：`/`、`/shop`、`/cart`、`/account`。
- Admin: `/admin`, `/admin/orders`, `/admin/redeem`, `/admin/customers`, `/admin/loyalty`, `/admin/management`, `/admin/overview`, `/admin/products`, `/admin/coupons`, `/admin/stores`, `/admin/access`. / Admin：上述可直接访问并刷新安全的路由。

Saved products render as a shelf inside Cart. Role-based Admin navigation is derived from the authenticated server session. / 收藏商品在 Cart 内以 shelf 展示；基于角色的 Admin 导航由已认证服务端 session 派生。

## Local development / 本地开发

```bash
npm ci
npm run dev
```

The vinext dev server is for local development. The Firebase Hosting artifact is produced by the Next.js Webpack build. / vinext dev server 用于本地开发；Firebase Hosting 产物由 Next.js Webpack 构建生成。

## Public configuration / 公开配置

Set the approved `NEXT_PUBLIC_*` Firebase client values and API base URL for the target environment. Custom auth-domain selection supports the connected `kiyoyo.africa` hostname while retaining the Firebase default domain for localhost/pre-cutover use. / 为目标环境设置已批准的 `NEXT_PUBLIC_*` Firebase 客户端值与 API base URL；自定义 auth-domain 选择支持已连接的 `kiyoyo.africa` hostname，同时为 localhost/切换前保留 Firebase 默认域名。

Public browser configuration is embedded at static build time and must never contain Admin secrets, service-account keys, database credentials, POSPAL keys, or pickup signing keys. / 公开浏览器配置会在静态构建时嵌入，绝不能包含 Admin secret、service-account key、数据库凭据、POSPAL key 或取餐签名 key。

## Verification / 验证

```bash
npm run lint
npm run check
npm test
npm run build -- --webpack
```

`npm test` builds the vinext preview and runs route/contract tests. The final command verifies the production static export in `web/out`. / `npm test` 构建 vinext preview 并运行路由/契约测试；最后一条命令验证 `web/out` 中的生产静态导出。

For UI changes, also follow `.codex/skills/kiyoyo-uiux` and verify affected responsive widths, keyboard/focus behaviour, accessible labels/live regions, and absence of page-level horizontal overflow. / UI 改动还必须遵循 `.codex/skills/kiyoyo-uiux`，验证受影响响应式宽度、键盘/焦点行为、可访问 label/live region，以及页面级无横向溢出。

For medium or large changes, update affected bilingual docs through `.codex/skills/maintain-project-docs` in the same branch/PR. / 中大型改动必须通过 `.codex/skills/maintain-project-docs` 在同一分支/PR 更新受影响双语文档。
