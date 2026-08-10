resource "google_apikeys_key" "maps_browser" {
  name         = "${local.prefix}-maps-browser"
  display_name = "KIYOYO ${var.environment} browser maps"

  restrictions {
    browser_key_restrictions {
      allowed_referrers = local.maps_allowed_referrers
    }

    api_targets {
      service = "maps-backend.googleapis.com"
    }

    api_targets {
      service = "routes.googleapis.com"
    }
  }

  depends_on = [google_project_service.required]
}
