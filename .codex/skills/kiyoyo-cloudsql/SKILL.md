---
name: kiyoyo-cloudsql
description: Operate KIYOYO Cloud SQL PostgreSQL directly from a local machine through Cloud SQL Auth Proxy, without building or deploying Cloud Run. Use for database inspection, read-only SQL queries, controlled data updates, checking schema_migrations, creating or applying versioned SQL migrations, and verifying database changes in dev, staging, or prod.
---

# KIYOYO Cloud SQL

Use the bundled `scripts/kiyoyo-db` command from the repository root. It discovers the
Cloud SQL connection name, retrieves the database password from Secret Manager without
printing it, starts a temporary localhost-only proxy, runs the requested operation, and
stops the proxy.

## Preserve the deployment boundary

- Connect directly through Cloud SQL Auth Proxy. Do not deploy Cloud Run or execute/update
  a Cloud Run migration job for a database-only request.
- Do not change Terraform, Cloud Run images, or application revisions unless the user
  separately asks for a deployment or infrastructure change.
- Default to `dev`. State the resolved project, environment, instance, database, and user
  before executing any operation.
- Never expose database passwords, access tokens, or Secret Manager payloads in output.

## Choose the operation

### Query or inspect

Use `query` or `status`. These commands enforce PostgreSQL read-only mode.
The script rejects embedded transaction control and psql meta-commands so a query file
cannot commit the read-only transaction and continue in write mode.

```bash
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db query --sql "select now();"
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db query --file /absolute/path/query.sql
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db status
```

Prefer bounded queries. Add `limit` to exploratory row reads, avoid `select *` on large
tables, and report the exact environment queried.

### Update data

Before writing:

1. Inspect the target rows with a read-only query.
2. Show the intended SQL and expected row scope to the user.
3. Obtain explicit approval for the exact environment and mutation.
4. Run `write` with the matching `--confirm-env`. The script wraps the SQL in one
   transaction, rejects embedded transaction control, and stops on the first error.
5. Re-query the affected rows and report evidence.

```bash
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db write \
  --file /absolute/path/approved-update.sql \
  --confirm-env dev
```

For `prod`, require both explicit user approval naming production and `--confirm-prod`.
Treat `delete`, `truncate`, bulk updates without a narrow predicate, privilege changes,
and irreversible SQL as destructive actions requiring exact scope confirmation.

### Create and apply a migration

1. Inspect `api/src/migrate.ts`, `api/migrations/`, and `schema_migrations` before editing.
   If the database contains an applied migration absent from the current branch, stop and
   switch to or update from the branch containing that migration before continuing.
2. Create one new uniquely named, forward-only SQL file in `api/migrations/`. Keep it
   additive and backward compatible. Never modify an already-applied migration.
3. Avoid down migrations and destructive schema changes. Require explicit destructive
   approval for any `drop`, narrowing type conversion, or data deletion.
4. Run API tests that cover the new schema contract.
5. Show pending/applied state with `status`, then obtain explicit environment approval.
6. Apply locally through the existing `api/src/migrate.ts` runner:

```bash
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db migrate --confirm-env dev
```

7. Verify `schema_migrations` and the resulting schema/data directly. Report migration
   filename, target, runner output, and verification separately.

The local migration command builds the API migration runner and connects it to the
temporary proxy. It does not build a container, update a Cloud Run job, or deploy an API
revision. If application code depends on the migration, explain that the code still needs
its normal deployment later.

## Environment and prerequisites

The script derives KIYOYO names from `--env`:

- instance: `kiyoyo-<env>-db`
- database: `kiyoyo_<env>` with hyphens converted to underscores
- database user: `<database>_api`
- password secret: `kiyoyo-<env>-db-password`

Override project, region, or local port only when live configuration proves the defaults
wrong. The local account needs Cloud SQL Client and Secret Manager Secret Accessor.

```bash
.codex/skills/kiyoyo-cloudsql/scripts/kiyoyo-db \
  --env staging --project kiyoyo --region europe-west1 status
```

If a prerequisite is missing, install or authenticate it explicitly. Prefer the user's
existing `gcloud` login with Proxy `--gcloud-auth`; do not create service-account keys.

## Report results

Separate these facts in the completion message:

- target environment and database;
- operation and whether it was read-only or write-enabled;
- SQL/migration actually executed;
- row counts or schema evidence;
- anything not deployed or not verified.
