resource "google_iam_workload_identity_pool" "github_actions" {
  workload_identity_pool_id = "${local.prefix}-github"
  display_name              = "KIYOYO ${var.environment} GitHub Actions"
  description               = "Keyless GitHub Actions authentication for ${var.github_repository}"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_actions_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions.name}/attribute.repository/${var.github_repository}"
}

resource "google_service_account_iam_member" "deployer_can_use_api_identity" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
