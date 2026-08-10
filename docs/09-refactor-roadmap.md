# KIYOYO 重构路线图与持续记忆

最后更新：2026-08-10
状态：Phase 2 已执行
重构前基线：`57a555e chore: checkpoint pre-refactor commerce baseline`

## 如何使用本文档

本文档是重构工作的持久化记忆。后续开发者或自动化代理开始工作前必须先阅读本文档，完成一个阶段或作出影响范围、接口、数据来源的决定后必须同步更新：

1. 当前阶段、完成项和下一步。
2. 行为契约或风险是否发生变化。
3. 实际运行过的验证及结果。
4. 决策日志，包括被否决的替代方案。

聊天记录不是重构状态的唯一来源；本文档和 Git 历史才是恢复工作的依据。

## 目标与边界

目标是在不损失客户商城、Drink Studio、商品商城、账户、购物车、结账、取餐二维码和 Admin 功能的前提下，降低单文件复杂度、重复数据与跨层耦合。

重构阶段遵守以下边界：

- 结构调整与业务行为修复分开提交。
- 不同时更改组件归属、API 请求格式和业务规则。
- 不删除 mock 支付，直到真实支付适配器和生产 fail-closed 保护完成。
- 不删除本地订单缓存，直到一次性取餐二维码有等价持久化方案。
- 不删除 seed 数据，直到前后端共享或生成式目录来源完成。
- 每个阶段必须可独立构建、验证和回滚。

## 不可破坏的行为契约

### 客户商城

- 保持 Home、Shop、Saved、Cart、Account 五个主要目的地。
- 饮品和普通商品保持不同购买路径；饮品必须先进入定制流程。
- Drink Studio 保持门店上下文、分类导航、尺寸、糖度、冰量、加料和实时价格。
- 商品、价格、折扣、标签、上下架状态和图片仍以 Admin/目录数据为目标事实来源。
- 保持英语/中文切换；新增持久文案必须同时提供两种语言。
- 保持 campaign、搜索、收藏、购物车、登录、资料、地址、优惠券和订单历史入口。
- 保持 390、768、1280、1440 px 的响应式目标，44 px 触控目标和 reduced-motion 支持。

### 结账与履约

- 服务端继续重新计算商品、尺寸、加料、折扣、配送费和总价。
- 购物车存在不可用商品时不能继续结账。
- Delivery/Shipping 需要地址；Pickup 需要有效门店。
- 重复点击、超时和重试最终必须只创建一笔订单。
- Pickup 成功后返回一次性二维码；重新签发使旧二维码失效；已核销二维码不能再次使用。
- 当前 MOCK 通道必须清晰标注为测试，不得静默进入生产。

### Admin

- 保持授权门禁，不在服务器渲染 HTML 中输出订单或客户数据。
- 保持商品上下架、并发版本检查、标签管理、图片签名上传、优惠券生命周期、客户管理、门店管理、订单状态和取餐核销。
- 客户可见或破坏性操作保持确认、明确状态和错误反馈。

### API 与数据

- 现有 `/v1` 路径和请求/响应格式在结构重构阶段保持不变。
- Cloud SQL 事务、审计日志、签名取餐令牌和授权前置处理保持不变。
- 数据库迁移只向前追加；重构不得改写已部署迁移。
- 金额继续使用 KES 整数，时区继续使用 `Africa/Nairobi`。

## 当前复杂度基线

| 文件 | 基线规模 | 风险 |
| --- | ---: | --- |
| `web/app/components/KiyoyoApp.tsx` | 基线 3613 行、Phase 2 后 1415 行 | 状态与业务编排仍集中，但页面和弹层已按领域拆分 |
| `web/app/admin/AdminApp.tsx` | 2471 行、约 30 个 state | Admin 数据加载、写操作和界面集中 |
| `web/app/globals.css` | 5360 行 | 客户与 Admin 样式共享全局级联 |
| `api/src/server.ts` | 983 行、51 个路由 | schema、SQL、业务规则和 HTTP 混合 |
| `web/app/menu.ts` + `api/src/seed.ts` | 47 条饮品重复 | 名称、价格、图片和标签可能漂移 |

## 阶段计划

### Phase 0：冻结重构前基线 — 完成

- [x] 检查现有变更范围。
- [x] 排除依赖、构建产物、Terraform state 和原始素材。
- [x] 创建基线提交 `57a555e`。

### Phase 1：回归保护与工作记忆 — 完成

- [x] 创建本持续记忆文档并加入文档索引。
- [x] 保留客户与 Admin 服务器渲染契约。
- [x] 增加前端/API 菜单一致性及菜单图片完整性测试。
- [x] 增加取餐令牌签名、篡改和哈希行为测试。
- [x] 增加统一验证脚本。
- [x] 修复 `.env.example` 和 TypeScript 构建缓存忽略规则。

Phase 1 不改变页面、API、数据库或业务行为。

验证结果（2026-08-10）：Web ESLint、TypeScript、Vinext 预渲染、Next Webpack 生产构建、4 个 Web 契约测试、API TypeScript、6 个 API 测试、Terraform 格式和 Git whitespace 检查全部通过。

### Phase 2：拆分客户前端 — 完成

- [x] 抽取 `copy`、纯函数、持久化 hook 和展示 primitives。
- [x] 拆分 Header、Desktop/Mobile Navigation。
- [x] 拆分 Campaign、Home、商品卡片和饮品卡片。
- [x] 拆分 Drink Studio 和商品定制弹层。
- [x] 拆分 Saved、Cart 和 Checkout。
- [x] 拆分 Account、Profile、Address、Coupon 和 Order History。
- [x] 建立共享 `DialogBackdrop`，统一 Escape、焦点圈定、焦点返回和最上层弹层判断。

执行提交：

- `8e76a44 refactor: extract customer storefront foundations`
- `cdaa5ea refactor: split customer navigation and storefront views`
- `489064b refactor: split customer account checkout and dialogs`
- 共享弹层行为提交见本阶段完成提交。

Phase 2 保留现有 `/v1` API、localStorage key、目录与结账规则、双语文案、CSS class 和业务事件顺序。`KiyoyoApp.tsx` 从 3613 行降至 1415 行，新建 21 个 `customer` 领域文件；主组件继续拥有状态和业务编排，视图与弹层通过显式 props 接收数据和操作。

验证结果（2026-08-10）：完整重构验证入口通过；本地浏览器额外验证商品定制与全局搜索弹层的 dialog 语义、初始焦点、Shift+Tab 圈定、Escape 关闭、关闭后焦点返回，浏览器控制台无 warning/error。Phase 2 未修改响应式 CSS 或既有内容 class。

### Phase 3：拆分 Admin — 待执行

- 将 overview、orders、products、coupons、customers、stores、pickup scanner 拆成独立功能模块。
- 将 Admin API DTO 与映射移出页面组件。
- 保持一次加载和所有写接口的现有顺序与错误语义。

### Phase 4：拆分 API 模块化单体 — 待执行

- 按 auth、catalog、checkout、orders、coupons、admin、media、pickup 拆 routes。
- 将 Zod schema、service、repository/SQL 和 HTTP adapter 分层。
- 先迁移代码位置，后修复业务规则；不在同一提交中混合。

### Phase 5：统一数据来源与 CSS — 待执行

- 使用单一菜单 manifest 或生成步骤，消除 Web/API seed 重复。
- 客户门店改用 API 数据，静态数据仅允许明确的开发回退。
- 将全局 CSS 按 tokens、shell、commerce、transactional、admin 和 responsive 分层。

### Phase 6：修复已确认问题 — 待执行

优先顺序：

1. 稳定的 checkout idempotency key 和服务端并发重放。
2. 服务端履约地址、门店能力和商品定制校验。
3. 区分公开目录与 Admin 下架目录。
4. 移除生产环境的静默 seed/localStorage 目录回退。
5. 接入实时门店和收藏 API。
6. 建立支付 provider 接口与生产 fail-closed，再移除客户路径中的 MOCK 固定成功令牌。

### Phase 7：删除与收尾 — 待执行

- 删除无引用 ChatGPT auth、Next 默认 SVG 和确认废弃的图片。
- 若确定不使用 Cloudflare D1，成组删除 D1 示例、Drizzle 配置与依赖。
- 更新所有已漂移文档，完成依赖与资源复核。

## 验证矩阵

每个阶段至少运行：

```bash
sh scripts/verify-refactor.sh
```

该入口覆盖：

- Web ESLint 与 TypeScript。
- Web Vinext 预渲染/契约测试和 Next Webpack 生产构建。
- API TypeScript 与单元/契约测试。
- Terraform 格式检查。
- Git diff whitespace 检查。

涉及 UI 行为时，还必须验证 390、768、1280、1440 px，键盘焦点、loading/empty/error/disabled/success、双语文本和 reduced motion。涉及数据库或 Cloud API 时补充相应集成测试，不能以构建通过替代。

## 回滚与比较

- 查看重构差异：`git diff 57a555e..HEAD`。
- 在不改变当前分支的情况下检查基线：`git worktree add <临时目录> 57a555e`。
- 已提交阶段出现问题时优先使用 `git revert <阶段提交>`，保留历史和后续工作。
- 不使用会覆盖未提交工作的强制 reset。

## 已知风险与明确延期

| 风险 | 当前影响 | 处理阶段 |
| --- | --- | --- |
| 固定 MOCK 成功支付 | 只适合明确测试环境 | Phase 6 |
| 客户重试生成新幂等键 | 网络超时后可能重复下单 | Phase 6 |
| API 履约校验不完整 | 可生成无法配送的订单 | Phase 6 |
| 公开请求包含下架目录 | 下架商品元数据可被获取 | Phase 6 |
| 客户使用静态门店 | Admin 门店变更不传播 | Phase 5/6 |
| localStorage/seed 静默回退 | 可能展示旧价格和旧标签 | Phase 5/6 |
| 弹层新共享焦点管理需持续覆盖嵌套场景 | 地址弹层可能叠加在结账/订单弹层上 | 后续 UI 回归持续验证 |
| API 路由测试覆盖不足 | 服务拆分回归风险较高 | Phase 4 前持续补充 |

## 决策日志

### 2026-08-10

- 选择先提交现有工作区，再开始重构；基线为 `57a555e`。
- Phase 1 只增加文档、测试、验证入口和忽略规则，不移动生产代码。
- 不把 mock 支付或本地订单缓存当作死代码直接删除，因为当前功能仍依赖它们。
- 使用过渡性菜单一致性测试保护重复 seed；Phase 5 引入单一数据来源后替换该测试。
- Phase 2 采用“状态与业务编排留在 `KiyoyoApp`、视图按领域拆出”的过渡架构，避免同时改动状态模型和页面归属。
- 所有结构拆分保持原 JSX 顺序和 CSS class；共享弹层可访问性作为独立行为变更处理。
- 共享弹层只响应 DOM 中最上层 backdrop，防止 Checkout 与 Address 等嵌套弹层在一次 Escape 中同时关闭。

## 下一步

Phase 3 从 Admin 的只读 overview 和 DTO 映射开始，先拆视图与数据转换，再逐个迁移写操作；不得在同一提交中改变 Admin API 请求、确认流程或错误语义。
