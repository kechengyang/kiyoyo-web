# KIYOYO GCP infrastructure

The `dev` environment uses the `kiyoyo-dev-*` prefix and runs in
`europe-west1`. Terraform state is stored in the versioned bucket
`gs://kiyoyo-dev-tfstate/terraform/env/dev`.

## Apply

```sh
gcloud auth login
gcloud config set project kiyoyo
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"
terraform init
terraform plan -var-file=dev.tfvars
terraform apply -var-file=dev.tfvars
unset GOOGLE_OAUTH_ACCESS_TOKEN
```

CI/CD 应使用 Workload Identity Federation；上述 access token 方法仅用于已授权的本地
运维终端，避免生成长期 service-account JSON key。

Database and pickup-signing secrets are generated as ephemeral values. They
are written directly to Cloud SQL and Secret Manager and never stored in the
Terraform state. Increment `secret_version` only when intentionally rotating
both secrets.

The state bucket is a bootstrap resource and is deliberately not managed by
the state it stores. It was created with uniform bucket access and object
versioning enabled.

## Runtime deployment

- API service: `kiyoyo-dev-api`
- Migration job: `kiyoyo-dev-migrate`
- Seed job: `kiyoyo-dev-seed`
- Hosting site: `kiyoyo-dev`

Run migrations before routing traffic to an API revision that requires the new
schema. Seed is only for an empty dev catalog and must not be run as a routine
production deploy step.
