# KIYOYO 技术设计文档索引

版本：MVP v1 · 2026-08-12
市场：Kenya / Nairobi · 币种 KES · 时区 Africa/Nairobi  
架构原则：前后端分离、模块化单体、托管优先、按量付费、可逐步演进。

## 文档

1. [产品与范围](./01-product-requirements.md)
2. [系统架构](./02-system-architecture.md)
3. [数据模型](./03-data-model.md)
4. [API 设计](./04-api-design.md)
5. [GCP 部署与成本](./05-gcp-deployment.md)
6. [安全、隐私与二维码核销](./06-security-privacy.md)
7. [测试、监控与运营](./07-testing-operations.md)
8. [本地开发与迁移](./08-local-development.md)
9. [重构路线图与持续记忆](./09-refactor-roadmap.md)
10. [Admin 门店角色与权限管理系统设计（Review 已通过）](./10-admin-rbac-system-design.md)
11. [GitHub CI 与 GCP dev 持续部署](./11-ci-cd.md)
12. [顾客登录模块设计与实施说明](./11-customer-auth-module-design.md)

## 关键决策摘要

- 客户端、Admin 与后端 API 分离；MVP 后端先做一个 Cloud Run 模块化单体，不拆微服务。
- Web/PWA 先行，可覆盖网页、Android 和 iPhone；业务验证后再用 Expo React Native 做原生壳。
- 饮品与普通商品共用购物车和结账入口，但订单内拆成独立履约组。
- 支付 MVP 使用 `MockPaymentProvider`，保留真实支付适配器、幂等键和支付状态机。
- 浏览器定位后在前端对 6 家门店坐标执行 Haversine 计算；Google Maps 只在用户打开地图或路线时调用。
- 生产数据库采用 Cloud SQL PostgreSQL；图片采用 Cloud Storage；异步任务采用 Cloud Tasks。
- 公开资料目前只能完整核实 Kilimani、Westlands、CBD、Parklands 四店。Eastleigh 与第六店的精确地址/电话/坐标必须由运营确认。

## 当前状态

`kiyoyo-dev` 的 Web、Cloud Run API、Cloud SQL、Cloud Storage 与 Firebase Authentication 已部署。支付仍为明确标记的 MOCK 测试通道；Google/Facebook provider 仍需 KIYOYO 自有 OAuth 凭据。重构工作以提交 `57a555e` 为回滚基线，进度和行为契约记录在第 9 份文档中。
