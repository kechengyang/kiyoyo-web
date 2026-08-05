variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
  default     = "kiyoyo"
}

variable "app_name" {
  description = "Application name used in every resource prefix."
  type        = string
  default     = "kiyoyo"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"
}

variable "region" {
  description = "Primary GCP region. Cloud Run and Cloud SQL stay together here."
  type        = string
  default     = "europe-west1"
}

variable "database_name" {
  description = "PostgreSQL application database name."
  type        = string
  default     = "kiyoyo_dev"
}

variable "database_user" {
  description = "PostgreSQL application role."
  type        = string
  default     = "kiyoyo_dev_api"
}

variable "secret_version" {
  description = "Increment to rotate generated database and signing secrets."
  type        = number
  default     = 1
}

variable "allowed_origins" {
  description = "Browser origins allowed to upload directly to Cloud Storage."
  type        = list(string)
  default = [
    "http://localhost:3000",
    "https://kiyoyo-dev.web.app",
    "https://kiyoyo-dev.firebaseapp.com",
  ]
}

variable "api_image" {
  description = "Immutable Commerce API container image deployed to Cloud Run."
  type        = string
  default     = "europe-west1-docker.pkg.dev/kiyoyo/kiyoyo-dev/api:dev-20260805-3"
}
