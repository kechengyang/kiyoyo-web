output "resource_prefix" {
  value = local.prefix
}

output "region" {
  value = var.region
}

output "artifact_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}

output "media_bucket" {
  value = google_storage_bucket.media.url
}

output "database_instance_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "database_name" {
  value = google_sql_database.app.name
}

output "database_user" {
  value = google_sql_user.api.name
}

output "api_service_account" {
  value = google_service_account.api.email
}

output "tasks_service_account" {
  value = google_service_account.tasks.email
}

output "deployer_service_account" {
  value = google_service_account.deployer.email
}

output "github_workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github_actions.name
}

output "firebase_hosting_url" {
  value = "https://${google_firebase_hosting_site.app.site_id}.web.app"
}

output "firebase_custom_domain_urls" {
  value = [for domain in var.custom_domains : "https://${domain}"]
}

output "firebase_web_app_id" {
  value = google_firebase_web_app.app.app_id
}

output "firebase_auth_handler_url" {
  description = "OAuth callback to register with Google provider"
  value       = "https://${local.primary_web_domain}/__/auth/handler"
}

output "customer_auth_action_url" {
  description = "Custom email verification and password reset handler"
  value       = "https://${local.primary_web_domain}/auth/action"
}

output "api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "maps_browser_key" {
  value     = google_apikeys_key.maps_browser.key_string
  sensitive = true
}
