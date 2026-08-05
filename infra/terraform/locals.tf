locals {
  prefix = "${var.app_name}-${var.environment}"

  labels = {
    app        = var.app_name
    env        = var.environment
    managed-by = "terraform"
  }

  required_services = toset([
    "apikeys.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudtasks.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "identitytoolkit.googleapis.com",
    "logging.googleapis.com",
    "maps-backend.googleapis.com",
    "monitoring.googleapis.com",
    "routes.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "sts.googleapis.com",
  ])
}
