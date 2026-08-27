# 06 · 安全、隐私与二维码核销

## 权限模型

- 客户只能读取/修改自己的账户、收藏、地址和订单。
- 门店员工只访问 JWT custom claims 中授权的 `store_ids`。
- 运营可跨店看订单/用户；积分人工调整和权限管理只给管理员。
- Admin 强制 MFA、短 session、空闲超时和敏感操作重新认证。
- 每个管理写操作记录 actor、请求 ID、实体、前后状态、门店和时间。

## 客户认证

- Identity Platform 负责邮箱密码与 Google OAuth；KIYOYO 服务绝不接收或保存用户密码。
- 邮箱注册保留找回密码、弱密码策略与登录限流；顾客会员激活与结账不要求邮箱验证。
- Google token 只在官方 SDK/后端验证流程中使用，不写日志或 localStorage。
- OAuth state、nonce、PKCE 和 redirect URI 必须由官方 SDK/配置管理；不同环境使用不同 OAuth 应用或严格的回调域名列表。
- 客户资料中的昵称、性别、年龄和地址均为个人信息；编辑、导出、删除和保留期限纳入隐私流程。
- Google 登录上线前需要配置 OAuth consent screen 和正式域名。

## 取餐二维码

二维码内容使用高熵不透明 token 或签名 payload，不直接放订单号、用户 ID、手机号或可预测序列。数据库只保存 token 的 SHA-256 hash。

核销必须满足：

1. 员工已登录且有订单门店权限。
2. token 存在、未过期、未核销。
3. 履约类型为 PICKUP，状态通常为 READY。
4. 在数据库事务中 `SELECT ... FOR UPDATE`，原子写入 `redeemed_at/redeemed_by` 并把履约改成 COMPLETED。
5. 重复请求返回第一次结果或 409，不可再次放行。

为网络不稳定门店设计时，MVP 不做离线核销。无法连接服务器就不改变取餐状态，员工可用订单号走有审计的人工流程。离线可核销方案会显著增加双花风险。

## API 安全

- HTTPS only，HSTS，安全 Cookie（若使用）设置 HttpOnly/Secure/SameSite。
- CORS 只允许正式域名；CSRF 防护用于 Cookie 会话。
- 输入 schema 校验，数据库参数化查询，输出编码。
- 登录、搜索用户、结账和核销分别限流；核销失败达到阈值告警。
- Webhook 使用原始 body 验签、时间窗口和 provider event 去重。
- 错误响应不泄露 SQL、堆栈、token 或客户详情。

## 数据保护

- 最小化收集：配送需要的姓名、电话、地址；定位默认只用于本地算最近店，不必上传。
- 用户同意后才保存精确地址/坐标；拒绝定位不影响手动点单。
- Secret Manager 保存 secrets，Cloud KMS/Google-managed encryption at rest。
- 日志屏蔽 Authorization、支付 token、完整电话、地址和 pickup token。
- 定义保留策略：订单按法务/财务要求；精确定位不入日志；失效 guest cart 定期删除。
- 提供账户导出、更正、删除/匿名化流程；涉及交易记录时按肯尼亚适用规则保留必要财务信息。

## 支付 MVP 安全边界

- 测试页面和订单必须显著标记 `TEST` / `is_test=true`。
- Mock provider 只能在非生产或显式 feature flag 下启用；生产启动时若没有真实 provider 必须 fail closed。
- 即使模拟支付，也不在前端信任总价；后端重新报价并记录支付状态。
- 绝不存银行卡原始信息；未来接入 M-Pesa/卡支付时使用 provider tokenization/hosted flow。

## 威胁检查清单

- 重放同一 checkout 或 QR。
- 门店员工跨店核销。
- 修改前端价格、积分、优惠券和状态请求。
- 枚举订单号、手机号或用户 ID。
- 图片上传恶意文件或超大文件。
- 库存竞争导致超卖。
- 管理员账号被盗和批量导出客户。
- 地图 API key 被其他域名滥用。

上线前进行依赖扫描、SAST、关键 API 渗透测试和权限矩阵测试，并用 OWASP ASVS 作为验收基线。

## 商品图片与价格安全

- 上传使用短期、单对象 signed URL，限制 content length；服务端以实际文件内容检测类型，不信任扩展名或客户端 MIME。
- 拒绝 SVG/HTML 作为商品主图；对 JPEG/PNG/WebP 解码重编码，移除 EXIF/GPS，并限制像素尺寸防止解压炸弹。
- 原始上传桶不公开；只有处理完成的派生图可通过 CDN 读取。
- 商品价格、折扣和上架状态只允许有 Catalog 权限的 Admin 修改，并写不可变审计日志。
- 客户端显示价仅供展示；购物车报价、优惠和订单金额全部由服务端计算并带版本/幂等控制。
