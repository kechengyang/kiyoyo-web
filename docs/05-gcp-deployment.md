# 05 · GCP deployment and environments / GCP 部署与环境

This file documents repository configuration, not inferred live state. Verify the current Terraform plan, Cloud Run revision/traffic, migration job, Hosting release, DNS, Identity Platform, and authenticated UX before calling a release live-verified. / 本文记录仓库配置，而不是推断出的线上状态；在声称发布“线上已验证”前，必须核对当前 Terraform plan、Cloud Run revision/traffic、迁移 job、Hosting release、DNS、Identity Platform 与登录后 UX。

## Naming and region / 命名与区域

- GCP project configured for dev: `kiyoyo`. / dev 配置的 GCP 项目：`kiyoyo`。
- Primary region: `europe-west1`; Cloud Run and Cloud SQL stay colocated. / 主区域：`europe-west1`；Cloud Run 与 Cloud SQL 同区。
- Resource prefix: `kiyoyo-{env}` for `dev`, `staging`, or `prod`. / 资源前缀：`dev`、`staging` 或 `prod` 对应 `kiyoyo-{env}`。
- Dev examples: `kiyoyo-dev-api`, `kiyoyo-dev-db`, `kiyoyo-dev-media`, `kiyoyo-dev-migrate`, and Hosting site `kiyoyo-dev`. / dev 示例：`kiyoyo-dev-api`、`kiyoyo-dev-db`、`kiyoyo-dev-media`、`kiyoyo-dev-migrate` 与 Hosting site `kiyoyo-dev`。

The repository configures `kiyoyo.africa` and `www.kiyoyo.africa` as dev custom domains and allowed origins. Terraform configuration does not prove DNS ownership, certificate issuance, Hosting attachment, or OAuth callback acceptance. / 仓库把 `kiyoyo.africa` 与 `www.kiyoyo.africa` 配置为 dev 自定义域名和允许 origin；Terraform 配置不能证明 DNS 所有权、证书签发、Hosting 绑定或 OAuth callback 已被接受。

## Provisioned resources / 已配置资源

| Resource / 资源 | Repository purpose / 仓库用途 |
|---|---|
| Firebase Hosting + Web App | Static customer/Admin Web / 静态顾客端/Admin Web |
| Identity Platform | Email/password, Google, phone/SMS identity / 邮箱密码、Google、手机号/SMS 身份 |
| Cloud Run service | Public Commerce API / 公开 Commerce API |
| Cloud Run jobs | Database migration and seed / 数据库迁移与 seed |
| Cloud SQL PostgreSQL | Transactional data / 交易数据 |
| Private Cloud Storage | Product media / 商品图片 |
| Artifact Registry | Immutable API images / 不可变 API 镜像 |
| Secret Manager | Database password and pickup signing key / 数据库密码与取餐签名 key |
| Cloud Tasks | Order-event and media-processing queues; workers are not implemented / 订单事件与图片处理队列；worker 尚未实现 |
| Monitoring | Uptime, API 5xx, database CPU, notification channel / Uptime、API 5xx、数据库 CPU 与通知渠道 |
| Billing budget | Dev budget alert; not a hard spending cap / dev 预算告警；不是硬性支出上限 |
| Maps API key | Browser-restricted Maps access / 浏览器限制的 Maps 访问 |
| GitHub WIF | Keyless CI deployment / 无密钥 CI 部署 |

## Application deployment / 应用部署

Merges to `main` run `.github/workflows/deploy-dev.yml`. Changed paths select Web, API, or infrastructure. Documentation-only changes select neither Web nor API. / 合并到 `main` 会运行 `.github/workflows/deploy-dev.yml`；路径变化选择 Web、API 或基础设施；仅文档改动不会选择 Web 或 API。

### Web deployment / Web 部署

1. Install with `npm ci`. / 使用 `npm ci` 安装。
2. Run `npm run build -- --webpack`; static output is `web/out`. / 运行 `npm run build -- --webpack`；静态产物为 `web/out`。
3. Authenticate with GitHub OIDC/WIF and deploy Firebase Hosting. / 使用 GitHub OIDC/WIF 认证并部署 Firebase Hosting。
4. Smoke `/` and `/admin`. / 冒烟检查 `/` 与 `/admin`。

### API deployment / API 部署

1. Build and push an image tagged with the Git commit SHA. / 构建并推送以 Git commit SHA 标记的镜像。
2. Update and execute `kiyoyo-dev-migrate`, waiting for success. / 更新并执行 `kiyoyo-dev-migrate`，等待成功。
3. Deploy the same immutable image to Cloud Run. / 将同一不可变镜像部署到 Cloud Run。
4. Smoke `/health` and `/readyz`. / 冒烟检查 `/health` 与 `/readyz`。

Terraform changes are format/validate checked in CI and explicitly not auto-applied by the application deployment. / Terraform 改动会在 CI 中检查格式与 validate，并明确不会被应用部署自动 apply。

## Release evidence / 发布证据

A complete release record includes: merged SHA, successful CI jobs, successful migration execution, deployed Cloud Run revision and 100% traffic target, `/health`, `/readyz`, Hosting URLs, and affected public/protected API checks. Authenticated UX requires a separate manual or browser-session check. / 完整发布记录包括：合并 SHA、成功的 CI jobs、成功的迁移执行、已部署 Cloud Run revision 与 100% traffic 目标、`/health`、`/readyz`、Hosting URL，以及受影响的公开/受保护 API 检查；登录后 UX 还需要单独的手工或浏览器 session 检查。

## Rollback / 回滚

- Web: redeploy a known-good static build. / Web：重新部署已知可用的静态构建。
- API: move traffic to a known-good revision or redeploy its immutable image. / API：把 traffic 切回已知可用 revision，或重部署其不可变镜像。
- Database: migrations are forward-only; prefer corrective migrations. Never assume code rollback can undo schema/data changes. / 数据库：迁移只向前；优先使用修正迁移；不得假设代码回滚能撤销 schema/数据变化。
- Terraform: review a targeted plan; never use application rollback as infrastructure rollback. / Terraform：审查 targeted plan；不得用应用回滚代替基础设施回滚。

## Cost boundary / 成本边界

Cloud SQL instance/storage and some monitoring/network resources can incur fixed cost even at low traffic; Cloud Run, Hosting, Storage, Maps, SMS, and external APIs vary with usage. The configured billing budget only alerts. Current bills and currency must be read from Cloud Billing, not estimated from this file. / 即使流量很低，Cloud SQL 实例/存储及部分监控/网络资源也可能产生固定成本；Cloud Run、Hosting、Storage、Maps、SMS 与外部 API 随用量变化；已配置预算只会告警；当前账单与币种必须从 Cloud Billing 获取，不能从本文估算。
