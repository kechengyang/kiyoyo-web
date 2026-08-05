resource "google_project_service" "required" {
  for_each = local.required_services

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = local.prefix
  description   = "KIYOYO ${var.environment} application images"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}
