locals {
  prefix        = "${var.app_name}-${var.environment}"
  database_name = coalesce(var.database_name, replace(local.prefix, "-", "_"))
  database_user = coalesce(var.database_user, "${local.database_name}_api")

  custom_domain_origins = [for domain in var.custom_domains : "https://${domain}"]
  primary_web_domain    = try(var.custom_domains[0], "${local.prefix}.web.app")

  environment_origins = concat(
    [
      "https://${local.prefix}.web.app",
      "https://${local.prefix}.firebaseapp.com",
    ],
    local.custom_domain_origins,
  )

  allowed_origins = distinct(concat(
    var.environment == "dev" ? ["http://localhost:3000"] : [],
    local.environment_origins,
    var.additional_allowed_origins,
  ))

  maps_allowed_referrers = [for origin in local.allowed_origins : "${origin}/*"]

  firebase_authorized_domains = distinct(concat(
    [
      "localhost",
      "kiyoyo.firebaseapp.com",
      "kiyoyo.web.app",
      "${local.prefix}.web.app",
      "${local.prefix}.firebaseapp.com",
    ],
    var.custom_domains,
  ))

  labels = {
    app        = var.app_name
    env        = var.environment
    managed-by = "terraform"
  }

  required_services = toset([
    "apikeys.googleapis.com",
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
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
