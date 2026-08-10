# 07 · 测试、监控与运营

## 测试分层

### 单元测试

- Haversine 最近门店、营业时间和时区边界。
- 价格、优惠券、积分、订单状态机。
- pickup token 过期/重复/跨店规则。
- Mock payment 成功、拒绝、超时和重试。

### 集成测试

- PostgreSQL 真实事务：库存预留、订单+outbox、核销行锁。
- Identity JWT 权限和门店范围。
- Cloud Tasks 重试与幂等。
- API OpenAPI contract。

### E2E

- 中英文浏览 → 选店 → 定制饮品 → 收藏 → 购物车 → 测试支付 → 订单详情。
- 定位允许、拒绝、超时；门店关闭/商品下架后的重新报价。
- 混合购物车生成两个履约组。
- Admin 接单、制作、Ready、扫码核销；二次核销失败。
- 手机窄屏、桌面、键盘操作、基础无障碍。
- History 订单卡片可打开完整详情；同设备显示原始 QR，跨设备可重新签发。
- 重新签发后验证旧 QR 返回 404、新 QR 返回 200；已完成订单不能重新签发。

### `kiyoyo-dev` 测试管理员

- 测试账号：`admin-dev@kiyoyo.test`。
- 密码只通过受控交付提供，不写入 Git、Terraform、Secret Manager 或项目文档。
- Identity Platform 账号已设置已验证邮箱状态和 `admin` 自定义权限；真实线上登录及
  Admin 商品 API 已验证为成功。
- `.test` 地址不能收取重置邮件。需要轮换时由项目 Owner 通过 Identity Platform 管理；
  真实管理员必须使用可接收验证与重置邮件的邮箱。
- 该账号仅限 dev 测试。创建 staging/prod 环境时不得复制账号或密码；生产启用前必须
  禁用或删除共享测试管理员，改为个人账号与最小权限。

## 发布门禁

- lint、typecheck、unit、integration、build 全部通过。
- 数据库 migration 可向后兼容并在 staging 演练。
- staging smoke test 和关键 E2E 通过。
- Production 配置不能启用 mock payment；若 MVP 正式营业前仍测试，必须限制测试人员并隔离报表。
- 运营确认 6 店地址、电话、经纬度、营业时间和履约范围。

## 监控指标

### 技术 SLI

- API 请求量、p50/p95/p99、5xx、429。
- Cloud Run instance、冷启动、CPU、内存。
- Cloud SQL CPU、内存、连接、慢查询、磁盘。
- Tasks backlog、最老任务年龄、重试/死信。

### 业务指标

- 浏览到加购、加购到 checkout、checkout 成功率。
- 测试/真实支付成功率分开。
- 按门店订单量、平均客单价、取消率。
- `PLACED → READY` 制作时长、`READY → COMPLETED` 等待时长。
- QR 核销失败率和重复核销尝试。
- 新客次月复购、积分使用率、优惠券增量效果。

## 初始告警

- 当前 dev：API `/readyz` 每 5 分钟一次外部可用性检查。
- 当前 dev：Cloud Run 5xx 速率连续 5 分钟超过每分钟 3 次。
- 当前 dev：Cloud SQL CPU 连续 10 分钟超过 80%。
- 后续生产：5 分钟 5xx > 3% 且请求数 > 50。
- checkout 成功率较 7 日同小时基线下降 20%。
- Cloud SQL 连接 > 80%，磁盘 > 75%。
- Tasks 最老任务 > 5 分钟。
- 单门店连续 10 分钟无新订单但其他店正常（排除营业时间）。
- pickup redeem 同一员工/设备短时失败 > 10 次。

## 运营 Runbook

### 订单已付但未出单

查询 request ID、payment provider ref 和 outbox；确认幂等状态后重放事件，不能手工再扣款。

### 重复订单

比较 idempotency key、用户、金额和时间；保留一单并按支付 provider 流程退款，记录审计。

### 取餐码无法核销

核对门店、订单状态、过期时间和是否已使用。人工完成必须由有权限角色操作并强制填写原因。

### 某店停业/断网

运营立即把门店 `accepting_orders=false`；已下单客户由客服转店或取消。不要让前端仅靠缓存继续接单。

### 回滚

Cloud Run 流量切回上一 revision；若 schema 已迁移，代码必须兼容扩展后的 schema。破坏性数据库回滚通过单独审批和备份恢复演练。

## 备份与恢复

- Cloud SQL 自动每日备份和 PITR；生产上线前实测恢复到隔离实例。
- RPO 初始目标 15 分钟，RTO 4 小时；稳定营业后可提升。
- Cloud Storage 开启对象版本/保留策略视成本决定。
- 每季度做一次恢复演练并记录耗时、缺口与责任人。
