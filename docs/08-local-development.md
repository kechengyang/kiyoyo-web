# 08 · 本地开发与生产迁移

## 运行环境

- Node.js 22+
- npm
- 现代浏览器；定位测试需要 localhost 或 HTTPS

```bash
cd web
npm install
npm run dev
```

访问：

- 客户商城 `http://localhost:3000/`
- Admin `http://localhost:3000/admin`

## 当前本地原型如何工作

- `kiyoyo-lang`：中英文偏好。
- `kiyoyo-store`：当前门店。
- `kiyoyo-saved`：收藏。
- `kiyoyo-cart`：购物车。
- `kiyoyo-orders`：本地下单记录，Admin 会读取。
- `kiyoyo-session`：本地模拟登录 session，不是真实安全认证。
- `kiyoyo-profile`：昵称、性别、年龄和本地地址簿。
- `kiyoyo-catalog`：API 商品目录的只读浏览器缓存；PostgreSQL 与 GCS 是 dev 商品和图片的权威来源。
- 订单和 QR 是浏览器模拟，不可用于真实营业。
- Admin 自带示例订单；Ready 示例码 `P7LW9X3A` 可演示首次成功、再次失败。

清空浏览器站点数据即可重置演示状态。

## 代码结构

```text
web/
  app/
    components/KiyoyoApp.tsx  # 客户体验和本地状态
    admin/                     # Admin 管理原型
    data.ts                    # 产品、门店演示数据
    types.ts                   # 共享类型
    globals.css                # 响应式品牌 UI
  public/images/               # 已压缩网页素材
```

## 从原型迁移到真实前后端

1. 在仓库增加 `api/`（NestJS/Fastify）和 PostgreSQL migration。
2. 按 `04-api-design.md` 生成 OpenAPI typed client。
3. 把 `useStoredState` 替换为 API query/mutation；保留本地 UI state。
4. 接 Identity Platform，登录后合并游客 cart/favorites。
5. Checkout 改为后端报价和幂等下单；二维码由后端签发。
6. Admin 所有列表和状态操作改用授权 API；移除 sample data。
7. 图片上传 Cloud Storage，数据库只保存 object key/metadata。
8. 用 Terraform 创建 dev/staging/prod，接 CI/CD。

当前 Google 按钮只建立清晰标记的本地演示 session，不访问第三方网站、不取得真实 token。生产启用顺序：创建 OAuth 应用 → 配置 Identity Platform provider → 限制授权域名/回调 → API 验证 ID token → 邮箱验证和找回密码 → staging E2E → 生产开关。

商品图片在 localhost 和 Hosting 使用同一条 GCS 链路：Admin 先创建不可见草稿，向 API 申请短期 signed upload URL，浏览器直接上传不超过 8MB 的 JPG/PNG/WebP，API 校验对象后把 `gcs://<bucket>/products/...` 保存到 PostgreSQL。Data URL 只用于提交前的本地预览，不会写入数据库或商品目录缓存；没有有效 bucket path 的商品不能发布。

推荐 monorepo：

```text
apps/
  storefront/     # Next.js
  admin/          # Next.js（可先与 storefront 共仓）
  api/            # NestJS/Fastify on Cloud Run
packages/
  contracts/      # OpenAPI generated types
  domain/         # 无框架领域类型与校验
  ui/             # 品牌组件
infra/
  terraform/
```

## 环境变量（未来）

创建 `.env.example`，只列变量名和非敏感示例：

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_MEDIA_BUCKET`（仅用于构建时的离线商品图片回退；API 返回的 `image_key` 仍是权威值）
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`（限制域名/API/配额）
- `GCP_PROJECT_ID`
- `DATABASE_URL`（只在 API runtime）
- `PAYMENT_PROVIDER=mock|mpesa|...`
- `PICKUP_TOKEN_SIGNING_KEY`（Secret Manager，不放 `.env.example` 值）

## 门店数据待办

公开页面可核实：Kilimani、Westlands、CBD、Parklands。原型中的 Kilimani、Westlands、CBD 坐标来自公开 Google Maps 跳转；Parklands 使用近似区域坐标，仅供 UI 演示。Eastleigh 和 Store 06 精确资料待运营提供。生产前必须用门店负责人确认的 Google Place/坐标替换全部近似值。

参考公开资料：

- KIYOYO Stores: https://kiyoyo.africa/stores
- KIYOYO Homepage: https://kiyoyo.africa/
