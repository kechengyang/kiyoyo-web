resource "google_sql_database_instance" "main" {
  name             = "${local.prefix}-db"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = false

  settings {
    tier              = "db-f1-micro"
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    activation_policy = "ALWAYS"
    disk_type         = "PD_SSD"
    disk_size         = 20
    disk_autoresize   = true

    connector_enforcement       = "REQUIRED"
    deletion_protection_enabled = false

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ENCRYPTED_ONLY"
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }

    user_labels = local.labels
  }

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "app" {
  name     = var.database_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "api" {
  name                = var.database_user
  instance            = google_sql_database_instance.main.name
  password_wo         = ephemeral.random_password.database.result
  password_wo_version = var.secret_version
  deletion_policy     = "ABANDON"
}
