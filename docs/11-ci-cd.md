# 11 · Continuous integration and deployment / 持续集成与部署

## Pull-request and branch CI / PR 与分支 CI

`.github/workflows/ci.yml` runs on pull requests to `main`, pushes to non-main branches, and manual dispatch. Concurrency cancels obsolete runs for the same ref. / `.github/workflows/ci.yml` 在指向 `main` 的 PR、非 main 分支 push 与手工 dispatch 时运行；concurrency 会取消同一 ref 的过时运行。

| Job / Job | Checks / 检查 |
|---|---|
| Repository regression / 仓库回归 | `scripts/ci/*.test.mjs` |
| Web quality / Web 质量 | `npm ci`, lint, typecheck |
| Web regression / Web 回归 | vinext preview build and Node tests / vinext preview build 与 Node 测试 |
| Web build / Web 构建 | Next.js Webpack production build / Next.js Webpack 生产构建 |
| API quality / API 质量 | typecheck, tests, build / 类型检查、测试、构建 |
| Dependency audit / 依赖审计 | production dependencies, high severity threshold / 生产依赖，高严重度门槛 |
| Terraform / Terraform | format, backend-free init, validate / 格式、无 backend init、validate |

## Dev deployment / dev 部署

`.github/workflows/deploy-dev.yml` runs on `main` push or manual `all|web|api` dispatch. `deploy-dev-v2` serializes deployments without canceling an active release. / `.github/workflows/deploy-dev.yml` 在 `main` push 或手工 `all|web|api` dispatch 时运行；`deploy-dev-v2` 串行部署且不取消正在进行的发布。

`scripts/ci/changed-components.mjs` maps changes: / `scripts/ci/changed-components.mjs` 映射变化：

- Web paths and `firebase.json` deploy Web. / Web 路径与 `firebase.json` 部署 Web。
- API paths deploy API. / API 路径部署 API。
- Terraform paths flag infrastructure but do not auto-apply it. / Terraform 路径标记基础设施，但不自动 apply。
- Documentation and project-skill changes alone deploy neither application. / 只有文档与项目 skill 改动时，两项应用都不部署。

Web deployment builds `web/out`, authenticates through GitHub OIDC/WIF, deploys Firebase Hosting, and smokes `/` plus `/admin`. / Web 部署构建 `web/out`，通过 GitHub OIDC/WIF 认证，部署 Firebase Hosting，并冒烟检查 `/` 与 `/admin`。

API deployment builds an immutable SHA-tagged image, pushes Artifact Registry, updates/runs the migration job and waits, deploys Cloud Run, then smokes `/health` and `/readyz`. / API 部署构建不可变 SHA-tag 镜像、推送 Artifact Registry、更新/运行并等待迁移 job、部署 Cloud Run，再冒烟检查 `/health` 与 `/readyz`。

## Credentials and permissions / 凭据与权限

Deploy uses Workload Identity Federation variables `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT`; do not add long-lived service-account JSON keys. GitHub environments control dev deployment access. / 部署使用 WIF 变量 `GCP_WORKLOAD_IDENTITY_PROVIDER` 与 `GCP_DEPLOY_SERVICE_ACCOUNT`；不得添加长期 service-account JSON key；GitHub environment 控制 dev 部署权限。

## Failure handling / 失败处理

- A successful image build is not a successful migration or deployment. / 镜像构建成功不等于迁移或部署成功。
- Never deploy new API traffic after a failed migration. / 迁移失败后绝不能部署新 API traffic。
- A docs-only merge should have no Web/API deploy jobs; this is expected. / 仅文档合并不应有 Web/API deploy job，这是预期行为。
- Terraform validation success is not apply evidence. / Terraform validate 成功不是 apply 证据。
- If a GitHub run is queued with zero jobs, inspect run/jobs/check-suite state before cancellation or concurrency changes. / GitHub run 排队且零 job 时，取消或修改 concurrency 前先检查 run/jobs/check-suite 状态。
- Sandboxed `gh auth status` failure can be DNS/keychain isolation; recheck with approved host access before asking for login. / sandbox 内 `gh auth status` 失败可能是 DNS/keychain 隔离；要求重新登录前应使用已批准 host access 复核。

## Documentation gate / 文档门禁

For medium or large changes, load `.codex/skills/maintain-project-docs`, update affected bilingual docs in the same branch/PR, and distinguish implemented, provisioned, planned, and live-verified facts. / 中大型改动必须加载 `.codex/skills/maintain-project-docs`，在同一分支/PR 更新受影响双语文档，并区分已实现、已配置、规划中与线上已验证事实。
