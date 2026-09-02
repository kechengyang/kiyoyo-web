# KIYOYO documentation / KIYOYO 文档索引

Baseline: `origin/main` at `9d298c6`, reviewed 2026-08-30. / 基线：`origin/main` 的 `9d298c6`，复核日期 2026-08-30。

All maintained documentation is bilingual. Each statement pairs English and Chinese, while identifiers, schemas, commands, and diagrams remain language-neutral. / 所有维护中的文档均为中英双语；每条说明同时提供英文和中文，标识符、Schema、命令与图表保持语言无关。

## Status vocabulary / 状态词汇

| Status / 状态 | Meaning / 含义 |
|---|---|
| Implemented / 已实现 | Present in the reviewed repository and covered by code or tests. / 已存在于复核过的仓库中，并有代码或测试依据。 |
| Provisioned / 已配置 | Terraform or deployment workflow exists; current live state still needs verification. / Terraform 或部署工作流已存在；当前线上状态仍需验证。 |
| Planned / 规划中 | Design direction only; do not describe it as shipped. / 仅为设计方向，不得描述为已上线。 |
| Live-verified / 线上已验证 | Requires dated runtime evidence; this audit does not infer it from source. / 需要带日期的运行时证据；本次审计不会从源码推断线上状态。 |

## Documents / 文档

1. [Product and current scope / 产品与当前范围](./01-product-requirements.md)
2. [System architecture / 系统架构](./02-system-architecture.md)
3. [Data model and migrations / 数据模型与迁移](./03-data-model.md)
4. [API design and endpoint inventory / API 设计与端点清单](./04-api-design.md)
5. [GCP deployment and environments / GCP 部署与环境](./05-gcp-deployment.md)
6. [Security and privacy / 安全与隐私](./06-security-privacy.md)
7. [Testing and operations / 测试与运维](./07-testing-operations.md)
8. [Local development / 本地开发](./08-local-development.md)
9. [Refactor status and boundaries / 重构状态与边界](./09-refactor-roadmap.md)
10. [Admin RBAC design / Admin RBAC 设计](./10-admin-rbac-system-design.md)
11. [CI/CD / 持续集成与部署](./11-ci-cd.md)
12. [Customer authentication / 顾客身份认证](./11-customer-auth-module-design.md)
13. [POSPAL integration / POSPAL 集成](./12-pospal-integration.md)

## Architecture summary / 架构摘要

- Firebase Hosting serves one static Next.js build with customer and Admin routes. / Firebase Hosting 提供一个同时包含顾客端与 Admin 路由的 Next.js 静态构建。
- Cloud Run hosts one Fastify modular monolith; PostgreSQL is the transactional source of truth. / Cloud Run 承载一个 Fastify 模块化单体；PostgreSQL 是交易数据的事实来源。
- Identity Platform proves identity; trusted membership phone comes only from the verified token claim. / Identity Platform 证明用户身份；可信会员手机号只来自已验证 token claim。
- POSPAL is implemented as an Admin-triggered product catalogue source, not yet as an order sink. / POSPAL 已作为 Admin 触发的商品目录来源实现，尚未作为订单接收端实现。
- Cloud Tasks queues are provisioned, but task workers/outbox delivery are planned. / Cloud Tasks 队列已配置，但 task worker 与 outbox 投递仍在规划中。
- Documentation-only changes do not deploy Web or API. Terraform changes validate in CI but are never auto-applied. / 仅文档改动不会部署 Web 或 API；Terraform 改动会在 CI 校验，但不会自动 apply。

For every medium or large repository change, use `.codex/skills/maintain-project-docs` and update affected documents in the same branch and PR. / 每次中大型仓库改动都必须使用 `.codex/skills/maintain-project-docs`，并在同一分支和 PR 中更新受影响文档。
