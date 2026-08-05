resource "google_cloud_tasks_queue" "order_events" {
  name     = "${local.prefix}-order-events"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 5
    max_dispatches_per_second = 5
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "3600s"
    min_backoff        = "5s"
    max_backoff        = "300s"
    max_doublings      = 5
  }

  depends_on = [google_project_service.required]
}

resource "google_cloud_tasks_queue" "media_processing" {
  name     = "${local.prefix}-media-processing"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 2
    max_dispatches_per_second = 2
  }

  retry_config {
    max_attempts       = 5
    max_retry_duration = "3600s"
    min_backoff        = "10s"
    max_backoff        = "300s"
    max_doublings      = 5
  }

  depends_on = [google_project_service.required]
}
