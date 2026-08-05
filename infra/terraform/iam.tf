resource "google_service_account" "api" {
  account_id   = "${local.prefix}-api"
  display_name = "KIYOYO ${var.environment} API"
  description  = "Runtime identity for the KIYOYO Commerce API"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "tasks" {
  account_id   = "${local.prefix}-tasks"
  display_name = "KIYOYO ${var.environment} task caller"
  description  = "OIDC identity used by Cloud Tasks to call the API"

  depends_on = [google_project_service.required]
}

resource "google_service_account" "deployer" {
  account_id   = "${local.prefix}-deployer"
  display_name = "KIYOYO ${var.environment} deployer"
  description  = "Deployment identity for CI and Firebase Hosting"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "api_project_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/cloudtasks.enqueuer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "deployer_project_roles" {
  for_each = toset([
    "roles/firebasehosting.admin",
    "roles/serviceusage.serviceUsageConsumer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "api_can_sign_upload_urls" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.api.email}"
}
