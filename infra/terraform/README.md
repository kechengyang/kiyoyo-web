# KIYOYO GCP infrastructure / KIYOYO GCP 基础设施

Terraform defines environment-prefixed Google Cloud resources for KIYOYO. Repository configuration does not prove current live state; inspect a target-specific plan and cloud resources before making runtime claims. / Terraform 定义带环境前缀的 KIYOYO Google Cloud 资源；仓库配置不能证明当前线上状态，作出运行时结论前必须检查目标环境 plan 与云资源。

## Layout / 结构

- `dev.tfvars`: dev project, region, image, budget, Admin allowlist, and custom domains. / dev 项目、区域、镜像、预算、Admin allowlist 与自定义域名。
- `backend/dev.hcl`: remote-state backend settings. / remote state backend 设置。
- `cloud_run.tf`, `sql.tf`, `storage.tf`, `firebase.tf`, `tasks.tf`, `monitoring.tf`, `iam.tf`, `github_actions.tf`: service-specific resources. / 各服务资源定义。
- `secrets.tf`: generated database password and pickup signing key plus runtime access. / 生成的数据库密码、取餐签名 key 与运行时访问。

## Safe validation / 安全校验

```bash
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
```

These commands validate configuration without reading remote state or applying changes. / 这些命令在不读取 remote state 或 apply 的情况下校验配置。

## Plan and apply / Plan 与 apply

Use the exact target backend and tfvars, authenticated with an approved operator identity. Review the complete plan and isolate unrelated live drift before apply. / 使用准确目标 backend 与 tfvars，并以已批准运营身份认证；apply 前审查完整 plan，并隔离无关线上 drift。

```bash
terraform init -backend-config=backend/dev.hcl
terraform plan -var-file=dev.tfvars
```

An apply is an external mutation and requires explicit authorization and target confirmation. Never infer apply authorization from a request to validate, document, build, or deploy application code. / apply 是外部变更，需要明确授权与目标确认；不得从“校验、写文档、构建或部署应用代码”的请求中推断 apply 权限。

## Provisioned architecture / 已配置架构

- Firebase project/Web app/Hosting/Identity Platform. / Firebase project/Web app/Hosting/Identity Platform。
- Cloud Run API service plus migration and seed jobs. / Cloud Run API service 及迁移/seed jobs。
- Cloud SQL PostgreSQL, private Cloud Storage media, Artifact Registry. / Cloud SQL PostgreSQL、私有 Cloud Storage 图片、Artifact Registry。
- Secret Manager, service accounts/IAM, Cloud Tasks queues, Monitoring, billing budget, Maps browser key. / Secret Manager、service account/IAM、Cloud Tasks 队列、Monitoring、billing budget、Maps 浏览器 key。
- GitHub Workload Identity Federation for keyless deployment. / GitHub WIF 无密钥部署。

Cloud Tasks queues are provisioned but their application workers are not implemented. Custom domains are configured but DNS/certificate/Hosting/OAuth readiness must be verified independently. / Cloud Tasks 队列已配置，但应用 worker 尚未实现；自定义域名已配置，但 DNS/证书/Hosting/OAuth 就绪状态必须独立验证。

## Runtime deployment / 运行时部署

Application CI does not auto-apply Terraform. Web deployment publishes `web/out` to Firebase Hosting. API deployment builds an immutable image, runs the migration job, then deploys Cloud Run and checks health/readiness. / 应用 CI 不会自动 apply Terraform；Web 部署把 `web/out` 发布到 Firebase Hosting；API 部署构建不可变镜像、运行迁移 job，再部署 Cloud Run 并检查健康/就绪。

Keep Cloud Run and Cloud SQL in the same primary region. Use distinct state, data, secrets, images, domains, and Identity Platform configuration for each environment. / 保持 Cloud Run 与 Cloud SQL 位于同一主区域；每个环境使用独立 state、数据、secret、镜像、域名与 Identity Platform 配置。

For medium or large infrastructure changes, update bilingual architecture, deployment, security, operations, and local-development docs in the same PR. / 中大型基础设施改动必须在同一 PR 更新双语架构、部署、安全、运维与本地开发文档。
