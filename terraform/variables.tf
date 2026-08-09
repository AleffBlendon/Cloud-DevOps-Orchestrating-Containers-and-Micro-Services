# ─────────────────────────────────────────────────────────────────────────────
# Variables – generic Kubernetes cluster
# Swap the provider block in main.tf for your target cloud (EKS, GKE, AKS, etc.)
# ─────────────────────────────────────────────────────────────────────────────

variable "project_name" {
  description = "Project / cluster identifier"
  type        = string
  default     = "lojaveloz"
}

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "region" {
  description = "Cloud provider region"
  type        = string
  default     = "us-east-1"
}

variable "kubernetes_version" {
  description = "Kubernetes version to deploy"
  type        = string
  default     = "1.30"
}

variable "node_count" {
  description = "Number of worker nodes in the default node pool"
  type        = number
  default     = 3

  validation {
    condition     = var.node_count >= 1
    error_message = "node_count must be at least 1"
  }
}

variable "node_instance_type" {
  description = "Instance type / machine type for worker nodes"
  type        = string
  default     = "t3.medium"   # AWS example – adjust per provider
}

variable "db_password" {
  description = "PostgreSQL admin password (sensitive)"
  type        = string
  sensitive   = true
}
