# 11b · Customer authentication / 顾客身份认证

Status: email/password, Google, phone verification, trusted bootstrap, provider state, password reset, and verified-phone checkout gate are implemented in the repository. Provider-console and live authenticated behaviour require separate verification. / 状态：邮箱密码、Google、手机号验证、可信 bootstrap、provider 状态、密码重置与手机号结账门禁已在仓库实现；provider 控制台与线上登录行为需要另行验证。

## Decisions / 决策

- Web/PWA is the first client; Firebase Web SDK handles customer authentication. / Web/PWA 是首个客户端；顾客认证由 Firebase Web SDK 处理。
- Supported trusted providers are `PASSWORD` and `GOOGLE`. / 当前可信 provider 为 `PASSWORD` 与 `GOOGLE`。
- Firebase `uid` is the stable external identity key; PostgreSQL stores KIYOYO profile and linked identity projection. / Firebase `uid` 是稳定外部身份 key；PostgreSQL 保存 KIYOYO 资料与已绑定身份映射。
- Formal membership and checkout require a Firebase-verified phone number. Email verification is not a gate. / 正式会员与结账需要 Firebase 已验证手机号；邮箱验证不是门禁。
- Incomplete users remain signed in and may browse/manage authentication, but cannot submit checkout until phone verification succeeds. / 未完成用户保持登录并可浏览/管理认证，但手机号验证成功前不能提交结账。

## Components / 组件

| Layer / 层 | Responsibility / 职责 |
|---|---|
| `web/app/auth/firebase.ts` | Firebase client initialization and domain selection / Firebase 客户端初始化与域名选择 |
| `providers.ts`, `service.ts` | Sign-in, registration, linking, reset and provider operations / 登录、注册、绑定、重置与 provider 操作 |
| `phone.ts` | Kenyan/E.164 normalization and phone flow helpers / 肯尼亚/E.164 规范化与手机号流程 helper |
| `state.ts`, `useCustomerAuth.ts` | Session state, safe guest/member data ownership, bootstrap / session 状态、安全游客/会员数据归属、bootstrap |
| `AuthDialog`, `PhoneVerificationGate`, `ProviderManager` | User-facing auth and recovery UI / 面向用户的认证与恢复 UI |
| API auth middleware/service/repository/routes | Token trust, user/identity projection, profile and phone gates / token 信任、用户/identity 映射、资料与手机号门禁 |

## Trusted identity model / 可信身份模型

The browser sends a Firebase ID token. API verifies it and derives: Firebase UID, verified email state, trusted provider identities, verified phone, and Admin eligibility. Request body values may supply display nickname/locale only; they cannot assert provider, email verification, phone ownership, role, or membership. / 浏览器发送 Firebase ID token；API 校验后派生 Firebase UID、邮箱验证状态、可信 provider identity、已验证手机号与 Admin 资格；request body 只能提供显示昵称/语言，不能声明 provider、邮箱验证、手机号所有权、角色或会员资格。

`user_identities` prevents an active provider subject from being transferred. `users.phone_e164` is unique when present, and `phone_verified_at` must be consistent with it. / `user_identities` 防止有效 provider subject 被转移；`users.phone_e164` 存在时唯一，且 `phone_verified_at` 必须与其一致。

## Flows / 流程

### Email/password / 邮箱密码

Firebase performs registration or sign-in. After success, Web obtains a token and calls `POST /v1/auth/bootstrap`. Password reset returns generic success messaging to avoid account enumeration. / Firebase 执行注册或登录；成功后 Web 获取 token 并调用 `POST /v1/auth/bootstrap`；密码重置返回通用成功提示以避免账号枚举。

Email verification actions remain compatible identity operations, but UI and checkout do not require verified email. / 邮箱验证 action 保持兼容的身份操作，但 UI 与结账不要求邮箱已验证。

### Google sign-in / Google 登录

Firebase Google auth returns a token and the same bootstrap path creates/updates the KIYOYO account. Provider display uses trusted provider data and never infers password from the presence of an email. / Firebase Google auth 返回 token，并通过同一 bootstrap 路径创建/更新 KIYOYO 账号；provider 展示使用可信 provider 数据，不会因存在邮箱就推断为密码登录。

If Firebase reports `auth/account-exists-with-different-credential`, the user must authenticate with the existing provider before linking the pending credential. Never merge accounts from a client-supplied matching email alone. / 若 Firebase 返回 `auth/account-exists-with-different-credential`，用户必须先用现有 provider 认证，再绑定待处理 credential；绝不能仅因客户端邮箱相同就合并账号。

### Verified phone / 已验证手机号

Web uses `RecaptchaVerifier` and `linkWithPhoneNumber`, then confirms SMS OTP. On success it reloads the Firebase user, force-refreshes the ID token, and bootstraps again. / Web 使用 `RecaptchaVerifier` 与 `linkWithPhoneNumber`，再确认 SMS OTP；成功后重新加载 Firebase 用户、强制刷新 ID token，并再次 bootstrap。

The API trusts only decoded `phone_number`, writes normalized E.164 phone plus verification timestamp, and rejects conflicts with another member. `membershipReady` is derived from verified phone state only. / API 只信任解码后的 `phone_number`，写入规范化 E.164 手机号与验证时间，并拒绝与其他会员冲突；`membershipReady` 只由已验证手机号状态派生。

### Checkout resume / 返回结账

If a signed-in user lacks verified phone, Web opens the phone gate and preserves cart/checkout context. The API independently returns `PHONE_VERIFICATION_REQUIRED` for unverified tokens. After success, checkout resumes with a newly refreshed token. / 已登录用户缺少已验证手机号时，Web 打开手机号门禁并保留购物车/结账上下文；API 对未验证 token 独立返回 `PHONE_VERIFICATION_REQUIRED`；成功后使用新刷新 token 恢复结账。

## API contract / API 契约

`POST /v1/auth/bootstrap` returns business user data, trusted auth metadata (`uid`, email/phone verification, phone number, providers, `membershipReady`), and Admin eligibility. / `POST /v1/auth/bootstrap` 返回业务用户数据、可信认证元数据（`uid`、邮箱/手机号验证、手机号、providers、`membershipReady`）与 Admin 资格。

`requireProfile` protects member data. `requireVerifiedMembership` protects checkout and requires `phoneVerified && phoneNumber`; it does not require `emailVerified`. / `requireProfile` 保护会员数据；`requireVerifiedMembership` 保护结账并要求 `phoneVerified && phoneNumber`，不要求 `emailVerified`。

## Domain and provider configuration / 域名与 provider 配置

- Firebase Hosting domains and custom domains must be authorized in Identity Platform. / Firebase Hosting 域名与自定义域名必须在 Identity Platform 授权。
- Google OAuth client must allow the exact Firebase auth handler redirect URI for each active auth domain. / Google OAuth client 必须允许每个有效 auth domain 的准确 Firebase auth handler redirect URI。
- `kiyoyo.africa` is selected as custom auth domain only when the connected hostname matches; Firebase default domain remains the fallback for localhost/pre-cutover use. / 只有连接 hostname 匹配时才选择 `kiyoyo.africa` 作为自定义 auth domain；localhost/切换前继续以 Firebase 默认域名为 fallback。
- Phone/SMS provider, quotas, billing, test numbers, abuse protection, OAuth consent, and authorized origins require provider-console verification. / 手机/SMS provider、配额、计费、测试号码、滥用防护、OAuth consent 与授权 origin 需要在 provider 控制台验证。

## Security and tests / 安全与测试

Preserve generic recovery responses, trusted token projection, identity non-transfer, unique phone ownership, forced token refresh after phone linking, safe cancellation/error recovery, and clearing member state only after confirmed sign-out. / 必须保留通用恢复响应、可信 token 映射、身份不可转移、手机号唯一归属、绑定手机后强制刷新 token、安全取消/错误恢复，以及只在确认退出后清除会员状态。

Required regression tests cover auth domain selection, provider state, password/reset/link actions, guest favourite ownership, member switching, phone normalization, bootstrap, migrations, phone gate, and checkout contract. / 必需回归测试覆盖 auth domain 选择、provider 状态、密码/重置/绑定动作、游客收藏归属、会员切换、手机号规范化、bootstrap、迁移、手机号门禁与结账契约。
