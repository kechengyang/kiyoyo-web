# KIYOYO Commerce

KIYOYO 的双语客户商城与门店管理后台，面向肯尼亚内罗毕 6 家门店。项目采用前后端分离架构，开发环境已部署到 GCP 项目 `kiyoyo`，所有资源统一使用 `kiyoyo-dev` 前缀。

- 顾客端与 Admin：https://kiyoyo-dev.web.app
- API：Cloud Run `kiyoyo-dev-api`
- 数据：Cloud SQL PostgreSQL `kiyoyo-dev-db`
- 图片：Cloud Storage `gs://kiyoyo-dev-media`

## 本地运行

```bash
cd web
npm install
npm run dev
```

- 客户端：http://localhost:3000
- 管理端：http://localhost:3000/admin

支付目前使用明确标识的 MOCK 测试通道，不会真实扣款。线上用户、地址、商品、优惠、订单和取餐核销数据通过 Cloud Run API 写入 Cloud SQL；商品图片通过签名上传进入私有 Cloud Storage。

## 前端生产构建

```bash
cd web
npm run lint
npm test
npm run build
```

`npm run build` 使用 Next.js 静态导出并刷新 Firebase Hosting 发布目录 `web/out`。`npm run build:preview` 仅用于本地 vinext 预览验证，不应直接作为 Firebase 发布产物。

## 项目结构

- `web/` — Next.js 客户商城与 Admin
- `api/` — Cloud Run Commerce API、数据库迁移与 seed
- `infra/terraform/` — `kiyoyo-dev` GCP 资源定义
- `docs/` — 产品、架构、API、数据、GCP、安全、测试与开发文档
- `photo/` — 品牌原始图片素材
- `KIYOYO_Product_Review.html` — 经营层产品评审稿
- `KIYOYO_Architecture_Review.html` — 经营层架构评审稿

部署清单、成本与回滚流程见 `docs/05-gcp-deployment.md`。Google 登录入口已完成，但启用真实 provider 仍需要 KIYOYO 自有 OAuth Client ID / Secret。

环境规范为单一 GCP 项目 `kiyoyo` 下的 `kiyoyo-{env}` 资源前缀。当前仅部署
`kiyoyo-dev`；未来 staging/prod 必须分别使用自己的 backend 配置、tfvars、API 镜像和
前端 `NEXT_PUBLIC_*` 构建配置，不能复用 dev 数据或身份配置。
