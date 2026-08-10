#!/bin/sh
set -eu

script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_directory/.." && pwd)

echo "Verifying KIYOYO web"
(
  cd "$repository_root/web"
  npm run verify
)

echo "Verifying KIYOYO API"
(
  cd "$repository_root/api"
  npm run check
  node --import tsx --test test/*.test.ts
)

echo "Verifying Terraform formatting"
(
  cd "$repository_root/infra/terraform"
  terraform fmt -check -recursive .
)

echo "Checking pending diff whitespace"
git -C "$repository_root" diff --check

echo "KIYOYO refactor verification passed"
