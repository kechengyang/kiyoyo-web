variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
  default     = "kiyoyo"
}

variable "app_name" {
  description = "Application name used in every resource prefix."
  type        = string
  default     = "kiyoyo"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.app_name))
    error_message = "app_name must be a lowercase GCP-safe name between 3 and 20 characters."
  }
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of dev, staging, or prod."
  }
}

variable "region" {
  description = "Primary GCP region. Cloud Run and Cloud SQL stay together here."
  type        = string
  default     = "europe-west1"
}

variable "database_name" {
  description = "Optional PostgreSQL database override. Defaults to kiyoyo_{env}."
  type        = string
  default     = null
  nullable    = true
}

variable "database_user" {
  description = "Optional PostgreSQL role override. Defaults to kiyoyo_{env}_api."
  type        = string
  default     = null
  nullable    = true
}

variable "secret_version" {
  description = "Increment to rotate generated database and signing secrets."
  type        = number
  default     = 1
}

variable "additional_allowed_origins" {
  description = "Additional browser origins beyond the environment Hosting domains."
  type        = list(string)
  default     = []
}

variable "custom_domains" {
  description = "Custom Firebase Hosting domains without a scheme. They are authorized for browser, auth, media, and Maps access."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for domain in var.custom_domains :
      can(regex("^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", domain))
    ])
    error_message = "Every custom_domains value must be a lowercase hostname without a scheme, port, path, or trailing dot."
  }
}

variable "api_image" {
  description = "Immutable Commerce API container image deployed to Cloud Run."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]+-docker\\.pkg\\.dev/.+/(?:[^:]+@sha256:[a-f0-9]{64}|[^:]+:[A-Za-z0-9._-]+)$", var.api_image))
    error_message = "api_image must be a fully qualified Artifact Registry image tag or digest."
  }
}

variable "billing_account_id" {
  description = "Cloud Billing account used for the environment budget."
  type        = string
}

variable "monthly_budget_amount" {
  description = "Monthly budget in the billing account currency."
  type        = number
  default     = 30

  validation {
    condition     = var.monthly_budget_amount > 0
    error_message = "monthly_budget_amount must be greater than zero."
  }
}

variable "alert_email" {
  description = "Operations email for uptime, error and budget alerts."
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email must be a valid email address."
  }
}

variable "admin_emails" {
  description = "Verified email addresses allowed to access Admin in addition to admin custom claims."
  type        = set(string)
  default     = []

  validation {
    condition     = alltrue([for email in var.admin_emails : can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", email))])
    error_message = "Every admin_emails value must be a valid email address."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to deploy through Workload Identity Federation."
  type        = string
  default     = "kechengyang/kiyoyo-web"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must use the owner/repository format."
  }
}
