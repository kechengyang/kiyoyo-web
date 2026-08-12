# 11 · GitHub CI 与 GCP dev 持续部署

## 合并前检查

所有面向 `main` 的 Pull Request 都运行 `.github/workflows/ci.yml`：

- Web ESLint 与 TypeScript 检查。
- Web 关键页面回归测试与静态生产构建。
- API TypeScript 检查、优惠券/取餐码回归测试与生产构建。
- 部署路径分类回归测试，防止 Web/API 改动部署到错误组件。
- Web 与 API production dependencies 的 high/critical 漏洞审计。
- Terraform 格式、provider 初始化和配置校验。

`.github/workflows/codeql.yml` 还会在 PR、`main` 和每周一执行 JavaScript/TypeScript
安全扫描；Dependabot 每周检查 Web、API 与 GitHub Actions 依赖更新。

建议在 GitHub `main` branch protection 中要求以下 checks：

- `Repository regression`
- `Web lint and typecheck`
- `Web regression tests`
- `Web production build`
- `API typecheck, regression, and build`
- `Production dependency audit (web)`
- `Production dependency audit (api)`
- `Terraform format and validate`
- `JavaScript and TypeScript security scan`

同时启用：至少一个 approval、dismiss stale approvals、require conversation resolution、
禁止 force push，并要求分支在合并前保持最新。

## 合并后 dev 部署

`.github/workflows/deploy-dev.yml` 只在提交进入 `main` 后运行，并按 Git diff 选择组件：

| 变更路径 | dev 动作 |
|---|---|
| `web/**`、`firebase.json` | 构建静态站，部署 Firebase Hosting，检查 `/` 与 `/admin` |
| `api/**` | 构建不可变 SHA 镜像，推送 Artifact Registry，执行 migration job，部署 Cloud Run，检查 `/health` 与 `/readyz` |
| `infra/terraform/**` | 合并前校验；不会从应用部署 workflow 自动 apply |
| 仅文档或其他文件 | 不重新部署应用 |

Terraform 不在 merge 后自动 apply，避免未经人工检查就删除或替换 Cloud SQL、Secret、IAM
等有状态资源。基础设施改动必须先审查 plan，再由维护者显式 apply。

部署使用 GitHub Environment `dev` 和并发锁：同一时间只允许一个 dev 发布，后续发布不会
取消正在执行的 migration 或 Cloud Run 更新。需要重试时可手动运行 workflow，并选择
`all`、`web` 或 `api`。

## 一次性启用步骤

1. 由现有 GCP 管理员在本地应用本次 Terraform 变更，创建 GitHub OIDC provider 和最小化
   deployer 权限：

   ```sh
   cd infra/terraform
   terraform init -reconfigure -backend-config=backend/dev.hcl
   terraform plan -var-file=dev.tfvars
   terraform apply -var-file=dev.tfvars
   ```

2. 读取 Terraform 输出：

   ```sh
   terraform output -raw github_workload_identity_provider
   terraform output -raw deployer_service_account
   ```

3. 在 GitHub repository 创建 Environment `dev`，限制 deployment branch 为 `main`；如需人工
   放行 dev 发布，可配置 required reviewer。

4. 在该 Environment 或 repository 添加两个 Actions Variables：

   - `GCP_WORKLOAD_IDENTITY_PROVIDER`：第一条 Terraform 输出。
   - `GCP_DEPLOY_SERVICE_ACCOUNT`：第二条 Terraform 输出。

不创建或上传 service-account JSON key。OIDC provider 同时限制 GitHub repository 和
`refs/heads/main`，Pull Request 代码不能取得 dev 部署身份。

## 发布顺序与失败处理

- API migration 必须成功后才部署新的 Cloud Run revision。
- 任一 smoke test 失败都会使 deployment workflow 失败。
- Web 使用 Firebase Hosting release history 回滚。
- API 使用 Cloud Run revision traffic 回滚；migration 必须保持向后兼容。
- 合并前 CI 成功不代表线上 smoke 成功，两者都必须保留为可见检查记录。
