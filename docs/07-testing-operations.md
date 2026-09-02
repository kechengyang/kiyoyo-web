# 07 · Testing and operations / 测试与运维

## Automated verification / 自动化验证

### API verification / API 验证

`npm run verify` runs TypeScript checking and Node tests; `npm run build` compiles production output. / `npm run verify` 运行 TypeScript 检查与 Node 测试；`npm run build` 编译生产产物。

Current tests cover pickup cryptography, coupon pricing, auth projection/gates/migrations, RBAC permissions, POSPAL signing/normalization/sync, loyalty arithmetic/contract/immutability, and checkout route contracts. / 当前测试覆盖取餐密码学、优惠券计价、认证映射/门禁/迁移、RBAC 权限、POSPAL 签名/规范化/同步、积分计算/契约/不可变性与结账路由契约。

### Web verification / Web 验证

`npm run verify` runs ESLint, TypeScript, vinext preview build plus Node contract/render tests, and the Next.js Webpack production build. / `npm run verify` 运行 ESLint、TypeScript、vinext preview build 加 Node 契约/渲染测试，以及 Next.js Webpack 生产构建。

Current tests cover rendered routes, customer/Admin refresh-safe navigation, auth state and phone membership, catalogue/media contracts, product visibility, Admin RBAC, SSE/audio alerts, and loyalty UI contracts. / 当前测试覆盖渲染路由、顾客/Admin 刷新安全导航、认证状态与手机号会员、目录/图片契约、商品可见性、Admin RBAC、SSE/声音提醒与积分 UI 契约。

### Repository and infrastructure / 仓库与基础设施

- `node --test scripts/ci/*.test.mjs` verifies component selection and documentation-only deployment exclusion. / `node --test scripts/ci/*.test.mjs` 验证组件选择及仅文档改动不部署。
- `terraform fmt -check -recursive`, `terraform init -backend=false`, and `terraform validate` verify Terraform syntax/configuration without applying. / 相应 Terraform 命令在不 apply 的情况下校验语法与配置。
- `git diff --check` catches whitespace errors. / `git diff --check` 检查空白错误。

Passing automated checks does not prove provider consoles, current cloud deployment, migrations, data quality, or authenticated browser flows. / 自动化检查通过不能证明 provider 控制台、当前云端部署、迁移、数据质量或登录后的浏览器流程。

## Release gate / 发布门禁

1. Review the diff for scope, secrets, and documentation sync. / 审查 diff 的范围、secret 与文档同步。
2. Run focused tests, then complete API/Web/Terraform checks appropriate to changed paths. / 先运行针对性测试，再运行与变更路径相符的完整 API/Web/Terraform 检查。
3. Require successful CI before merge. / 合并前要求 CI 成功。
4. For API releases, require migration job success before Cloud Run traffic. / API 发布要求迁移 job 成功后再进入 Cloud Run traffic。
5. Verify health/readiness, static routes, affected public/protected endpoints, and authenticated UX where relevant. / 验证健康/就绪、静态路由、受影响公开/受保护端点，并在相关时验证登录 UX。
6. Record exact SHA, revision/release, tests, gaps, and whether evidence is source-only or live. / 记录准确 SHA、revision/release、测试、缺口，以及证据仅来自源码还是线上。

## Operational signals / 运维信号

| Signal / 信号 | Watch / 关注 |
|---|---|
| API / API | latency, 5xx, readiness, Cloud Run instances, DB pool errors / 延迟、5xx、就绪、Cloud Run 实例、DB pool 错误 |
| Database / 数据库 | CPU, connections, storage, locks, failed migrations / CPU、连接、存储、锁、失败迁移 |
| Commerce / 商城 | checkout outcomes, idempotent replays/conflicts, active/ready fulfilments / 结账结果、幂等重放/冲突、处理中/待取履约 |
| Loyalty / 积分 | wallet/ledger mismatch, negative-balance rejection, duplicate order transactions / 钱包/账本不一致、负余额拒绝、重复订单交易 |
| Live orders / 实时订单 | SSE connection/reconnect, listener errors, stale Admin list / SSE 连接/重连、listener 错误、Admin 列表过期 |
| POSPAL / 银豹 | last sync, unmatched products/dictionary rows, price diffs, retryable errors / 最近同步、未匹配商品/字典行、价格差异、可重试错误 |
| Auth / 认证 | token verification/revocation errors, phone conflicts, provider collisions / token 校验/撤销错误、手机号冲突、provider 冲突 |

## Operational runbooks / 运维 Runbook

### Order missing from Admin / Admin 看不到订单

Check checkout transaction/payment state, store scope, `/v1/admin/orders`, SSE connection, PostgreSQL notification listener, and manual refresh. Direct DB inserts do not emit application events. / 检查结账事务/支付状态、门店范围、`/v1/admin/orders`、SSE 连接、PostgreSQL notification listener 与手工刷新；直接 DB insert 不会发应用事件。

### Duplicate order / 重复订单

Search payment `idempotency_key` and order number before mutation. Preserve the first committed transaction; do not delete financial/audit history casually. / 修改前查询 payment `idempotency_key` 与订单号；保留首个已提交事务，不得随意删除财务/审计历史。

### Pickup failure / 取餐失败

Distinguish malformed signature, wrong store, missing hash, expired token, already redeemed token, and invalid fulfilment state. Reissue only through the owner endpoint. / 区分签名格式错误、门店错误、哈希不存在、过期、已核销与履约状态错误；只能通过所有者端点重发。

### Loyalty mismatch / 积分不一致

Compare wallet aggregates to ordered ledger transactions and order snapshots. The ledger is immutable; repair through an audited compensating transaction or reviewed corrective migration. / 对比钱包汇总、按序账本交易与订单快照；账本不可变，应通过已审计补偿交易或经审查的修正迁移处理。

### POSPAL sync issue / POSPAL 同步问题

Read sync status, config availability, last cursor, category/taste counts, unmatched rows, barcode duplicates, manual overrides, and retryability. Product sync is read-from-POSPAL/write-to-KIYOYO; it does not prove order upload. / 读取同步状态、配置可用性、最近游标、分类/口味数量、未匹配行、重复条码、手工覆盖与可重试性；商品同步是从 POSPAL 读取并写入 KIYOYO，不能证明订单已上传。

## Backup and recovery / 备份与恢复

Cloud SQL backup/PITR settings and actual restore drills must be verified in the target environment. A backup policy is incomplete until a restore is tested and timed. / Cloud SQL backup/PITR 设置与实际恢复演练必须在目标环境核验；只有备份而未测试并计时恢复，备份政策并不完整。
