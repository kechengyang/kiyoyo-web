# KIYOYO GCP infrastructure

The `dev` environment uses the `kiyoyo-dev-*` prefix and runs in
`europe-west1`. Terraform state is stored in the versioned bucket
`gs://kiyoyo-dev-tfstate/terraform/env/dev`.

## Apply

```sh
gcloud auth login
gcloud config set project kiyoyo
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
terraform init -reconfigure -backend-config=backend/dev.hcl
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
unset GOOGLE_OAUTH_ACCESS_TOKEN
```

Backend 配置按环境单独保存，资源变量也必须使用对应的 `{env}.tfvars`。当前只创建了
`backend/dev.hcl` 和 `dev.tfvars`；不得用 dev backend 或 dev 镜像部署 staging/prod。
数据库名、数据库用户、Hosting 域名、CORS 与 Maps referrer 会从统一前缀
`kiyoyo-{env}` 自动推导。

CI/CD 应使用 Workload Identity Federation；上述 access token 方法仅用于已授权的本地
运维终端，避免生成长期 service-account JSON key。

Database and pickup-signing secrets are generated as ephemeral values. They
are written directly to Cloud SQL and Secret Manager and never stored in the
Terraform state. Increment `secret_version` only when intentionally rotating
both secrets.

The state bucket is a bootstrap resource and is deliberately not managed by
the state it stores. It was created with uniform bucket access and object
versioning enabled.

The Google-managed default service accounts and Cloud Build staging bucket may
retain provider-assigned names. All KIYOYO-owned runtime resources are required
to use the `kiyoyo-{env}` prefix.

## Runtime deployment

- API service: `kiyoyo-dev-api`
- Migration job: `kiyoyo-dev-migrate`
- Seed job: `kiyoyo-dev-seed`
- Hosting site: `kiyoyo-dev`
- Monitoring: API readiness, API 5xx and Cloud SQL CPU policies
- Budget: `kiyoyo-dev monthly budget`

Run migrations before routing traffic to an API revision that requires the new
schema. Seed is only for an empty dev catalog and must not be run as a routine
production deploy step.

Firebase Hosting uses `web/out`. From `web/`, run `npm run build`; do not deploy
the vinext preview directory `web/dist`.
