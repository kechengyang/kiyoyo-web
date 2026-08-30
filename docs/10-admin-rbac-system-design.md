# 10 · Admin RBAC system design / Admin RBAC 系统设计

Status: implemented in repository; current live deployment and authenticated UX require separate verification. / 状态：仓库已实现；当前线上部署与登录后 UX 需要另行验证。

## Goals / 目标

- Two fixed roles: `ADMIN` and `OPERATOR`. / 两个固定角色：`ADMIN` 与 `OPERATOR`。
- One Operator may be assigned to multiple active stores; Admin is global and has no store assignment. / 一个 Operator 可分配多个有效门店；Admin 为全局角色且不分配门店。
- Authorization is enforced on the API, not inferred from hidden UI controls. / 授权在 API 执行，不能依赖隐藏 UI 控件。
- Removing access preserves account/access history and revokes sessions; it does not hard-delete the user. / 移除权限会保留账号/访问历史并撤销 session，不会硬删除用户。
- Admin creates staff username/password; internal alias email is an implementation detail. / Admin 创建员工用户名/密码；内部 alias email 是实现细节。

## Actual permission matrix / 实际权限矩阵

The current source in `api/src/admin/permissions.ts` is authoritative. / 当前权威来源为 `api/src/admin/permissions.ts`。

| Capability / 能力 | Admin | Operator |
|---|---:|---:|
| Orders read and transition / 订单读取与推进 | Global / 全局 | Assigned stores / 指定门店 |
| Pickup verify/redeem / 取餐验证/核销 | Global / 全局 | Assigned stores / 指定门店 |
| Customers read / 顾客读取 | Global / 全局 | Global read / 全局只读 |
| Loyalty read / 积分读取 | Yes / 是 | Yes / 是 |
| Store context read / 门店上下文读取 | Global / 全局 | Assigned stores / 指定门店 |
| Overview / 概览 | Yes / 是 | No / 否 |
| Customer write and password / 顾客写入与密码 | Yes / 是 | No / 否 |
| Products/tags write / 商品/标签写入 | Yes / 是 | No / 否 |
| Coupons and issuance / 优惠券与发放 | Yes / 是 | No / 否 |
| Loyalty settings/adjustment / 积分设置/调整 | Yes / 是 | No / 否 |
| Store write / 门店写入 | Yes / 是 | No / 否 |
| Staff access and audit / 员工权限与审计 | Yes / 是 | No / 否 |
| POSPAL management / POSPAL 管理 | Yes / 是 | No / 否 |

Operator permissions are exactly `orders.read`, `orders.transition`, `redeem.verify`, `redeem.execute`, `customers.read`, `loyalty.read`, and `stores.read`. Admin receives every declared permission. / Operator 权限精确为上述七项；Admin 获得所有声明权限。

## Data model / 数据模型

- `roles`: fixed system roles with bilingual names. / 固定系统角色及双语名称。
- `staff_accounts`: username, role, active/removed status, start/end/reason, actor and timestamps. / 用户名、角色、有效/移除状态、开始/结束/原因、操作者与时间。
- `staff_store_access`: Operator-to-store many-to-many scope. / Operator 到门店的多对多范围。
- `staff_access_periods`: append-style history of access windows. / 追加式访问周期历史。
- `audit_logs`: redacted action trail. / 脱敏动作审计轨迹。

Constraints require at least one store for an Operator, no store IDs for an Admin, one active access period, and a unique normalized username. / 约束要求 Operator 至少一个门店、Admin 不得带门店 ID、每人一个有效访问周期，并保证规范化用户名唯一。

## Authentication and session / 认证与会话

Staff login accepts a username, converts it to `<username>@staff.kiyoyo.internal`, and authenticates with Firebase email/password. The alias is not shown as a real contact email. / 员工登录接收用户名，将其转换为 `<username>@staff.kiyoyo.internal`，再使用 Firebase 邮箱密码认证；alias 不会作为真实联系邮箱展示。

API staff middleware verifies the ID token with revocation checking, resolves the KIYOYO user/staff account, rejects removed or expired access, loads role/permissions/store IDs, and applies store filters to data access. / API 员工 middleware 校验 ID token 并检查撤销，解析 KIYOYO 用户/员工账号，拒绝已移除或过期访问，加载角色/权限/门店 ID，并对数据访问应用门店过滤。

`GET /v1/admin/session` returns the server-approved role, permissions, stores, username, user ID, and legacy flag. Navigation must be derived from this response. / `GET /v1/admin/session` 返回服务端批准的角色、权限、门店、用户名、用户 ID 与 legacy 标记；导航必须由该响应派生。

## Access lifecycle / 权限生命周期

### Create / 创建

Admin with recent authentication submits username, display name, strong password/confirmation, role, and store IDs. The API creates Firebase identity first, then transactionally creates user/staff/access/audit rows; failed database creation deletes the new Firebase identity. / 近期认证的 Admin 提交用户名、显示名、强密码/确认、角色与门店 ID；API 先创建 Firebase identity，再事务性创建用户/员工/访问/审计记录；数据库创建失败会删除新 Firebase identity。

### Update or restore / 更新或恢复

Role and store scope update under a lock. A removed account requires explicit `restore`; restoration starts a new access period and records audit. / 角色与门店范围在锁下更新；已移除账号必须明确 `restore`；恢复会开启新访问周期并记录审计。

### Remove / 移除

Removal requires a reason, closes the active access period, records audit, and revokes Firebase refresh tokens. Self-removal and removal/demotion of the last active Admin are blocked. / 移除要求原因，会关闭有效访问周期、记录审计并撤销 Firebase refresh token；禁止自我移除以及移除/降级最后一个有效 Admin。

### Password set / 设置密码

Admin supplies a strong confirmed password and reason. The API updates Firebase, revokes sessions, and audits the action. / Admin 提供强密码、确认与原因；API 更新 Firebase、撤销 session 并审计该操作。

## Store isolation / 门店隔离

Order lists, transitions, pickup verification, pickup redemption, order alerts, and SSE events are filtered by authorized stores on the server. Admin may select global or store context; Operator may only use assigned stores. / 订单列表、状态推进、取餐验证、核销、订单提醒与 SSE 事件都在服务端按授权门店过滤；Admin 可选择全局或门店上下文，Operator 只能使用指定门店。

Customer reads are intentionally global for Operator. This is an explicit product rule and should be revisited with privacy policy before production. / Operator 的顾客读取有意设为全局；这是明确产品规则，生产前应结合隐私政策重新审查。

## User interface / 用户界面

- Admin Home provides direct task cards. / Admin Home 提供直接任务卡片。
- Operator navigation is limited to Home, Orders, Redeem, and Customers. / Operator 导航限制为 Home、Orders、Redeem 与 Customers。
- Admin additionally receives Management, Overview, Products, Coupons, Loyalty, Stores, and Access. / Admin 另有 Management、Overview、Products、Coupons、Loyalty、Stores 与 Access。
- Write controls must check permissions and server responses; read-only surfaces must not imply edit ability. / 写控件必须检查权限与服务端响应；只读页面不得暗示可编辑。
- Every route remains directly renderable; unauthorized sections must not leak data during loading or errors. / 每个路由保持可直接渲染；未授权模块在加载或错误中不得泄漏数据。

## Security and tests / 安全与测试

Password minimum is 12 characters with lowercase, uppercase, number, and symbol. Recent-auth middleware protects access mutations. Audit metadata is redacted. Firebase runtime needs permission to check revoked tokens. / 密码至少 12 位并包含大小写、数字与符号；recent-auth middleware 保护权限变更；审计元数据脱敏；Firebase runtime 需要校验已撤销 token 的权限。

Required regression areas: role permission table, store access, username normalization, session payload, Operator navigation/read-only UI, Admin-only loyalty writes, server-scoped overview, staff create/update/remove/restore/password, last-Admin/self protection, revocation, and audit. / 必需回归领域：角色权限表、门店访问、用户名规范化、session payload、Operator 导航/只读 UI、Admin-only 积分写入、服务端范围概览、员工创建/更新/移除/恢复/密码、最后 Admin/自我保护、撤销与审计。
