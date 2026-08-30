# 06 · Security and privacy / 安全与隐私

## Trust boundaries / 信任边界

- Firebase/Identity Platform proves identity; the Fastify API enforces business authorization. / Firebase/Identity Platform 证明身份；Fastify API 执行业务授权。
- The browser is untrusted for price, discount, inventory, membership, role, store scope, points, order state, and pickup validity. / 浏览器在价格、折扣、库存、会员、角色、门店范围、积分、订单状态与取餐有效性方面均不可信。
- PostgreSQL is the transactional source of truth; private media is accessed through signed upload and constrained API proxy paths. / PostgreSQL 是交易事实来源；私有图片通过签名上传与受限 API 代理路径访问。

## Customer identity / 顾客身份

- API verifies Firebase ID tokens and uses the Firebase `uid` as stable external identity. / API 校验 Firebase ID token，并使用 Firebase `uid` 作为稳定外部身份。
- Trusted provider, email verification, and phone number come from decoded claims, never request-body/profile/address fields. / 可信 provider、邮箱验证与手机号来自解码后的 claim，绝不来自 request body、资料或地址字段。
- Checkout requires verified phone membership; email verification is not an authorization gate. / 结账要求已验证手机号会员资格；邮箱验证不是授权门禁。
- Unique E.164 phone and provider-subject constraints prevent duplicate active ownership. / 唯一 E.164 手机号与 provider-subject 约束防止重复有效归属。
- Passwords are held by Identity Platform. Password reset and provider linking must avoid email enumeration and identity transfer. / 密码由 Identity Platform 保存；密码重置与 provider 绑定必须避免邮箱枚举与身份转移。

## Staff authorization / 员工授权

- Fixed roles are `ADMIN` and `OPERATOR`; permission middleware is required for every sensitive route. / 固定角色为 `ADMIN` 与 `OPERATOR`；每个敏感路由都必须使用权限 middleware。
- Operator order, transition, and redemption access is filtered against assigned store IDs on the server. Unauthorized targets return not-found semantics where appropriate. / Operator 的订单、状态推进与核销访问在服务端按指定门店 ID 过滤；不允许的目标在适当场景返回 not-found 语义。
- Staff token verification checks revocation. High-risk access/password changes require recent authentication. / 员工 token 校验检查撤销状态；高风险权限/密码变更要求近期认证。
- Self-removal/demotion and removal of the last active Admin are blocked. Access removal revokes Firebase refresh tokens. / 禁止自我移除/降级以及移除最后一个有效 Admin；移除权限会撤销 Firebase refresh token。
- Staff usernames map to internal alias emails; the UI uses username/password rather than exposing the alias. / 员工用户名映射到内部 alias email；UI 使用用户名/密码，不暴露 alias。

## Checkout, points, and pickup / 结账、积分与取餐

- Checkout and manual point adjustments require idempotency keys and transaction locks. / 结账与手工积分调整要求幂等键与事务锁。
- Server reloads active products and computes price, coupon, fee, points, and total. / 服务端重新加载已上架商品并计算价格、优惠券、费用、积分与总额。
- Points cannot be used with a pending payment outcome; wallet mutations are locked and audited. / 等待中的支付结果不能使用积分；钱包变动会加锁并审计。
- Pickup token payloads are signed; only hashes are stored. Verify store, expiry, redemption state, and signature under a row lock before completion. / 取餐 token payload 经过签名；数据库只保存哈希；完成前在行锁下校验门店、过期、核销状态与签名。
- Token reissue is owner-only and atomically invalidates the old token. / token 重发仅限订单所有者，并原子化使旧 token 失效。

## API and browser protections / API 与浏览器保护

- Helmet headers, explicit CORS origins/methods, Zod input schemas, body/field limits, and generic errors reduce attack surface. / Helmet headers、明确 CORS origin/method、Zod 输入 schema、body/字段限制与通用错误降低攻击面。
- SSE requires authentication and server-side scope; secrets never appear in event payloads. / SSE 要求认证与服务端范围过滤；事件 payload 不包含 secret。
- Signed media upload is short-lived and object-key constrained; confirmation checks metadata before binding. / 图片签名上传短期有效且限制 object key；确认时检查元数据后再绑定。
- Secrets belong in Secret Manager or protected runtime configuration, never source, logs, browser bundles, or PR text. / secret 应位于 Secret Manager 或受保护运行时配置，绝不能进入源码、日志、浏览器 bundle 或 PR 文本。

## Privacy and retention / 隐私与保留

- Collect only data required for identity, fulfilment, support, fraud prevention, and audit. / 只收集身份、履约、客服、反欺诈与审计所需数据。
- Log request IDs and redacted metadata, not tokens, raw passwords, payment secrets, full pickup tokens, or unnecessary PII. / 日志记录 request ID 与脱敏元数据，不记录 token、原始密码、支付 secret、完整取餐 token 或不必要 PII。
- Order, payment, coupon, loyalty, access-period, and audit history may require retention; define production retention/deletion policy with legal review. / 订单、支付、优惠券、积分、访问周期与审计历史可能需要保留；生产保留/删除政策需经法务确认。
- Backup, export, support access, data-subject requests, and incident response need production runbooks before launch. / 备份、导出、客服访问、数据主体请求与事件响应在正式上线前需要生产 runbook。

## Known security gaps / 已知安全缺口

- Payment is MOCK and must not be presented as a real processor. / 支付为 MOCK，不得描述成真实支付处理方。
- Cloud Tasks workers and POSPAL order push/callback security are designs, not implemented controls. / Cloud Tasks worker 与 POSPAL 订单推送/回调安全仍是设计，不是已实现控制。
- Repository configuration cannot prove current IAM, DNS, provider-console, key restrictions, or runtime secret state. / 仓库配置不能证明当前 IAM、DNS、provider 控制台、key 限制或运行时 secret 状态。
