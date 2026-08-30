---
name: maintain-project-docs
description: Keep KIYOYO bilingual documentation synchronized with every medium or large code, architecture, data, authentication, infrastructure, deployment, or product-design change. Use in the same branch and PR as the implementation; do not use for a typo-only or other genuinely lightweight change unless it changes a documented contract.
---

# Maintain KIYOYO project documentation

Use this skill together with `manage-feature-workflow` after a change is classified as medium or major. Documentation is part of the implementation, not a later follow-up.

## Required outcome

- Inspect the actual diff and the current implementation before editing docs. Treat code, migrations, tests, workflows, and Terraform as evidence; do not copy stale plans forward.
- Update every affected maintained document in the same branch and PR. Preserve useful detail, remove contradicted claims, and keep commands, paths, routes, roles, schemas, and status current.
- Write all maintained docs in paired English and Chinese. Headings and human-readable table labels must be bilingual; each material statement must have equivalent meaning in both languages. Identifiers, code, diagrams, and command output need not be translated.
- Distinguish `Implemented / 已实现`, `Provisioned / 已配置`, `Planned / 规划中`, and `Live-verified / 线上已验证`. Source code alone never proves current deployment, credentials, provider consoles, DNS, migrations, data, or authenticated live UX.
- Update `docs/README.md` when documents, status vocabulary, index entries, or the reviewed baseline change.

## Change-to-document map

| Changed concern | Required review |
|---|---|
| Product behaviour, user roles, commerce rules | `README.md`, `docs/01-product-requirements.md` |
| Components, data flow, module boundaries, external services | `docs/02-system-architecture.md`, `docs/09-refactor-roadmap.md` |
| SQL migrations, constraints, persistence, money/state semantics | `docs/03-data-model.md` |
| Routes, request/response contracts, auth gates, errors, SSE | `docs/04-api-design.md` |
| Terraform, Firebase, Cloud Run, Cloud SQL, Storage, domain, cost | `docs/05-gcp-deployment.md`, `infra/terraform/README.md` |
| Identity, authorization, secrets, privacy, pickup, financial controls | `docs/06-security-privacy.md` and the relevant domain design |
| Tests, monitoring, failure handling, release evidence | `docs/07-testing-operations.md` |
| Commands, dependencies, environment variables, developer workflow | `docs/08-local-development.md`, component README files |
| Admin roles, permissions, store scope, access lifecycle | `docs/10-admin-rbac-system-design.md` |
| CI jobs, changed-component routing, deployment order | `docs/11-ci-cd.md` |
| Customer providers, linking, phone membership | `docs/11-customer-auth-module-design.md` |
| POSPAL source fields, sync, mapping, order integration | `docs/12-pospal-integration.md` |

Review all applicable rows; one change can require several documents. If a medium or major change genuinely leaves a mapped document unchanged, state the evidence in the PR rather than silently skipping review.

## Workflow

1. Record the base ref and list changed files. Read the relevant code, tests, migrations, workflows, Terraform, and existing docs.
2. Build a short fact table: current implementation, provisioned infrastructure, planned work, and live evidence. Resolve contradictions in favour of reviewed source for repository facts; flag live facts for separate verification.
3. Update docs while the implementation is still in progress, then re-check after the final code diff.
4. Run the focused application checks plus:

```bash
node .codex/skills/maintain-project-docs/scripts/check-doc-sync.mjs \
  --base origin/main --require-sync
git diff --check
```

5. Review the final diff for stale dates, copied secrets, dead links, unimplemented claims, and English/Chinese meaning drift. Include documentation files and validation evidence in the same commit/PR.

The checker is a guardrail, not proof of translation quality or architectural accuracy. Human review of meaning and evidence is still required.
