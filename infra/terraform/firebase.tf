resource "google_firebase_project" "app" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.required]
}

resource "google_firebase_web_app" "app" {
  provider     = google-beta
  project      = var.project_id
  display_name = "${local.prefix}-web"

  depends_on = [google_firebase_project.app]
}

resource "google_firebase_hosting_site" "app" {
  provider = google-beta
  project  = var.project_id
  site_id  = local.prefix
  app_id   = google_firebase_web_app.app.app_id
}

resource "google_identity_platform_config" "app" {
  project = var.project_id

  sign_in {
    allow_duplicate_emails = false

    anonymous {
      enabled = false
    }

    email {
      enabled           = true
      password_required = true
    }

    phone_number {
      enabled = false
    }
  }

  authorized_domains = local.firebase_authorized_domains

  depends_on = [
    google_firebase_project.app,
    google_project_service.required,
  ]
}
