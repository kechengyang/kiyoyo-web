# 08 · Local development / 本地开发

## Requirements / 环境要求

- Node.js 22 and npm. / Node.js 22 与 npm。
- PostgreSQL compatible with the migrations. / 与迁移兼容的 PostgreSQL。
- Terraform 1.15.x for infrastructure validation. / 用于基础设施校验的 Terraform 1.15.x。
- Firebase project/client config for real authentication flows. / 用于真实认证流程的 Firebase project/client 配置。
- Optional Google Cloud CLI, Cloud SQL Auth Proxy, Firebase CLI, and POSPAL credentials for scoped integration work. / 针对集成工作可选 Google Cloud CLI、Cloud SQL Auth Proxy、Firebase CLI 与 POSPAL 凭据。

Use `npm ci` for reproducible installs. Never commit `.env`, tokens, service-account JSON, database passwords, pickup signing keys, POSPAL keys, or generated cloud credentials. / 使用 `npm ci` 保证可复现安装；不得提交 `.env`、token、service-account JSON、数据库密码、取餐签名 key、POSPAL key 或生成的云凭据。

## Web development / Web 开发

```bash
cd web
npm ci
npm run dev
```

Default routes: customer `http://localhost:3000`, Admin `http://localhost:3000/admin`. / 默认路由：顾客端 `http://localhost:3000`，Admin `http://localhost:3000/admin`。

Relevant public variables include Firebase client values, API base URL, and optional custom auth domain. The build is static, so `NEXT_PUBLIC_*` values are embedded at build time. / 相关公开变量包括 Firebase 客户端值、API base URL 与可选自定义 auth domain；构建是静态的，因此 `NEXT_PUBLIC_*` 会在构建时嵌入。

```bash
npm run lint
npm run check
npm test
npm run build -- --webpack
```

`npm test` includes a vinext preview build; the final command verifies the Firebase Hosting production artifact. / `npm test` 包含 vinext preview build；最后一条命令验证 Firebase Hosting 生产产物。

## API development / API 开发

```bash
cd api
npm ci
npm run check
npm test
npm run build
```

Required runtime variables include `DB_PASSWORD` and `PICKUP_SIGNING_KEY`; non-dev environments also require explicit database host details. Firebase Admin uses Application Default Credentials or an approved runtime identity. / 必需运行时变量包括 `DB_PASSWORD` 与 `PICKUP_SIGNING_KEY`；非 dev 环境还需要明确数据库 host；Firebase Admin 使用 ADC 或已批准运行时身份。

Common variables: / 常用变量：

```dotenv
APP_ENV=dev
GOOGLE_CLOUD_PROJECT=kiyoyo
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=kiyoyo_dev
DB_USER=kiyoyo_dev_api
DB_PASSWORD=replace-locally
MEDIA_BUCKET=kiyoyo-dev-media
PICKUP_SIGNING_KEY=replace-locally
ALLOWED_ORIGINS=http://localhost:3000
```

Optional POSPAL variables are `POSPAL_APP_ID`, `POSPAL_APP_KEY`, `POSPAL_BASE_URL`, `POSPAL_HQ_ACCOUNT`, and `POSPAL_TIMEOUT_MS`. Missing POSPAL config disables only its Admin sync endpoints; API startup and migrations continue. / 可选 POSPAL 变量为 `POSPAL_APP_ID`、`POSPAL_APP_KEY`、`POSPAL_BASE_URL`、`POSPAL_HQ_ACCOUNT` 与 `POSPAL_TIMEOUT_MS`；缺少 POSPAL 配置只会禁用其 Admin 同步端点，不影响 API 启动与迁移。

Run migrations before seed: / 先运行迁移，再运行 seed：

```bash
npm run build
npm run migrate
npm run seed
npm run dev
```

For direct dev Cloud SQL work, use the project skill `.codex/skills/kiyoyo-cloudsql`; reads are default and writes/migrations require explicit target confirmation. Database-only work must not deploy Cloud Run. / 直接操作 dev Cloud SQL 时使用项目 skill `.codex/skills/kiyoyo-cloudsql`；默认只读，写入/迁移要求明确确认目标；仅数据库工作不得部署 Cloud Run。

## Terraform validation / Terraform 校验

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
```

Validation does not authorize `plan` against live credentials or `apply`. Use the correct backend/tfvars and review a targeted plan before any apply. / validate 不授权使用线上凭据执行 `plan` 或 `apply`；任何 apply 前必须使用正确 backend/tfvars 并审查 targeted plan。

## Change workflow / 改动工作流

- Use `.codex/skills/manage-feature-workflow` to classify and isolate repository changes. / 使用 `.codex/skills/manage-feature-workflow` 分类并隔离仓库改动。
- For medium/large changes, also use `.codex/skills/maintain-project-docs`; update bilingual docs in the same branch/PR. / 中大型改动还必须使用 `.codex/skills/maintain-project-docs`，并在同一分支/PR 更新双语文档。
- Preserve unrelated dirty files and never work directly on protected base branches. / 保留无关未提交文件，绝不直接在受保护基线分支工作。
