data "google_project" "current" {
  project_id = var.project_id
}

resource "google_monitoring_notification_channel" "operations_email" {
  display_name = "${local.prefix} operations email"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }

  depends_on = [google_project_service.required]
}

resource "google_monitoring_uptime_check_config" "api" {
  display_name       = "${local.prefix} API readiness"
  timeout            = "10s"
  period             = "300s"
  checker_type       = "STATIC_IP_CHECKERS"
  log_check_failures = true

  http_check {
    path           = "/readyz"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(google_cloud_run_v2_service.api.uri, "https://")
    }
  }

  content_matchers {
    content = "\"status\":\"ready\""
    matcher = "CONTAINS_STRING"
  }

  depends_on = [google_cloud_run_v2_service.api]
}

resource "google_monitoring_alert_policy" "api_unavailable" {
  display_name          = "${local.prefix} API unavailable"
  combiner              = "OR"
  severity              = "CRITICAL"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.operations_email.name]

  conditions {
    display_name = "Readiness check failed"

    condition_threshold {
      comparison      = "COMPARISON_LT"
      duration        = "120s"
      threshold_value = 1
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.api.uptime_check_id}\""

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    subject   = "KIYOYO ${var.environment} API is unavailable"
    content   = "Check Cloud Run `${google_cloud_run_v2_service.api.name}` and Cloud SQL `${google_sql_database_instance.main.name}` in `${var.region}`."
  }
}

resource "google_monitoring_alert_policy" "api_server_errors" {
  display_name          = "${local.prefix} API elevated 5xx"
  combiner              = "OR"
  severity              = "ERROR"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.operations_email.name]

  conditions {
    display_name = "More than 3 server errors per minute"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "300s"
      threshold_value = 0.05
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.service_name=\"${google_cloud_run_v2_service.api.name}\" AND metric.label.response_code_class=\"5xx\""

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    subject   = "KIYOYO ${var.environment} API is returning server errors"
    content   = "Inspect Cloud Run request logs for `${google_cloud_run_v2_service.api.name}` and verify database connectivity."
  }
}

resource "google_monitoring_alert_policy" "database_cpu" {
  display_name          = "${local.prefix} database high CPU"
  combiner              = "OR"
  severity              = "WARNING"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.operations_email.name]

  conditions {
    display_name = "Cloud SQL CPU over 80%"

    condition_threshold {
      comparison      = "COMPARISON_GT"
      duration        = "600s"
      threshold_value = 0.8
      filter          = "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" AND resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${var.project_id}:${google_sql_database_instance.main.name}\""

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  documentation {
    mime_type = "text/markdown"
    subject   = "KIYOYO ${var.environment} database CPU is high"
    content   = "Review slow queries and connection load before increasing the Cloud SQL instance size."
  }
}

resource "google_billing_budget" "development" {
  billing_account = var.billing_account_id
  display_name    = "${local.prefix} monthly budget"

  budget_filter {
    calendar_period = "MONTH"
    projects        = ["projects/${data.google_project.current.number}"]
  }

  amount {
    specified_amount {
      units = tostring(var.monthly_budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1
    spend_basis       = "FORECASTED_SPEND"
  }

  depends_on = [google_project_service.required]
}
