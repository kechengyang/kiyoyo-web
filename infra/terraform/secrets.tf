ephemeral "random_password" "database" {
  length           = 40
  special          = true
  override_special = "!#$%&*()-_=+"
}

ephemeral "random_password" "pickup_signing" {
  length  = 64
  special = false
}

resource "google_secret_manager_secret" "database_password" {
  secret_id = "${local.prefix}-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "database_password" {
  secret                 = google_secret_manager_secret.database_password.id
  secret_data_wo         = ephemeral.random_password.database.result
  secret_data_wo_version = var.secret_version
  deletion_policy        = "DISABLE"
}

resource "google_secret_manager_secret" "pickup_signing_key" {
  secret_id = "${local.prefix}-pickup-signing-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "pickup_signing_key" {
  secret                 = google_secret_manager_secret.pickup_signing_key.id
  secret_data_wo         = ephemeral.random_password.pickup_signing.result
  secret_data_wo_version = var.secret_version
  deletion_policy        = "DISABLE"
}

resource "google_secret_manager_secret_iam_member" "api_database_password" {
  secret_id = google_secret_manager_secret.database_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_pickup_signing_key" {
  secret_id = google_secret_manager_secret.pickup_signing_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}
