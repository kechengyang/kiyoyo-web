# KIYOYO Commerce

KIYOYO 的双语客户商城与门店管理后台原型，面向肯尼亚内罗毕 6 家门店。项目采用前后端分离的生产架构；当前版本用浏览器本地数据模拟完整业务流程，便于经营层评审和开发团队验证。

## 本地运行

```bash
cd web
npm install
npm run dev
```

- 客户端：http://localhost:3000
- 管理端：http://localhost:3000/admin

当前模拟支付不会真实扣款。客户下单、购物车、收藏、订单和语言偏好保存在浏览器 `localStorage`，管理端可读取本地客户订单并执行一次性取餐核销演示。

## 项目结构

- `web/` — Next.js 客户商城与 Admin 原型
- `docs/` — 产品、架构、API、数据、GCP、安全、测试与开发文档
- `photo/` — 品牌原始图片素材
- `KIYOYO_Product_Review.html` — 经营层产品评审稿
- `KIYOYO_Architecture_Review.html` — 经营层架构评审稿

正式环境将把浏览器本地数据替换成 Cloud Run API + Cloud SQL PostgreSQL，前端页面无需推倒重做。
