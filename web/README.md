# KIYOYO Commerce Web

KIYOYO 的顾客商城与 Admin 前端。它是一个 Next.js 静态导出应用，部署到
Firebase Hosting；订单、商品、用户、地址、门店、图片和核销数据全部通过独立的
Cloud Run API 访问。

## 本地开发

要求 Node.js `>=22.13.0`：

```sh
npm install
npm run dev
```

未设置环境变量时只允许使用已部署的 `kiyoyo-dev` 默认配置。可复制
`.env.example` 为 `.env.local` 覆盖本地值；`.env.local` 不应提交。

## 环境配置

每个静态构建都必须绑定一个明确环境：

- `NEXT_PUBLIC_KIYOYO_ENV`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_MAPS_BROWSER_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN`（可选；仅当页面实际运行在该域名或其 `www` 域名时使用）
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

`dev` 可使用代码中的受限公开 Web 配置作为本地默认值。`staging` 和 `prod` 缺少任一
值时构建会失败，避免正式页面误连 `kiyoyo-dev`。Firebase Web API key 和 Maps
browser key 会公开给浏览器，安全边界分别是 Firebase authorized domains 与 Maps
referrer/API restrictions；服务端 Secret 不得放在 `NEXT_PUBLIC_*` 中。

## 检查与构建

```sh
npm run lint
npm test
npm run build
```

- `npm run build`：生成 Firebase Hosting 静态产物 `out/`。
- `npm run build:preview`：生成 vinext 本地预览产物 `dist/`，不能部署到 Firebase。
- `npm test`：构建预览并检查顾客端与 Admin 的服务端渲染骨架。

根目录 `firebase.json` 当前把 `web/out` 发布到 Hosting site `kiyoyo-dev`。
`public/runtime-config.json` 是便于部署核对的非敏感环境元数据，并不替代构建时的
`NEXT_PUBLIC_*` 配置。
