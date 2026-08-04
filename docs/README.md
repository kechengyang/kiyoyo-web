# KIYOYO 技术设计文档索引

版本：MVP v1 · 2026-08-04  
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

## 关键决策摘要

- 客户端、Admin 与后端 API 分离；MVP 后端先做一个 Cloud Run 模块化单体，不拆微服务。
- Web/PWA 先行，可覆盖网页、Android 和 iPhone；业务验证后再用 Expo React Native 做原生壳。
- 饮品与普通商品共用购物车和结账入口，但订单内拆成独立履约组。
- 支付 MVP 使用 `MockPaymentProvider`，保留真实支付适配器、幂等键和支付状态机。
- 浏览器定位后在前端对 6 家门店坐标执行 Haversine 计算；Google Maps 只在用户打开地图或路线时调用。
- 生产数据库采用 Cloud SQL PostgreSQL；图片采用 Cloud Storage；异步任务采用 Cloud Tasks。
- 公开资料目前只能完整核实 Kilimani、Westlands、CBD、Parklands 四店。Eastleigh 与第六店的精确地址/电话/坐标必须由运营确认。

## 当前状态

本地原型已使用 `localStorage` 串通下单与后台核销演示。生产 API、Cloud SQL 和真实认证尚未部署。当前 gcloud 登录账号 `kechengyang234@gmail.com` 无法访问项目 ID `kiyoyo`；部署前需切换正确账号或授予 IAM 权限。
