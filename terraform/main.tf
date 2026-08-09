# ─────────────────────────────────────────────────────────────────────────────
# Terraform – Loja Veloz infrastructure skeleton
#
# This file uses the generic "kubernetes" provider + a local cluster block as a
# provider-agnostic skeleton.  Replace the provider section with your target:
#   AWS EKS  → hashicorp/aws  +  aws_eks_cluster resource
#   GCP GKE  → hashicorp/google + google_container_cluster resource
#   Azure AKS → hashicorp/azurerm + azurerm_kubernetes_cluster resource
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7"

  required_providers {
    # Generic Kubernetes provider – connects to an existing cluster
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }

    # Helm provider – optional, useful for deploying Prometheus/Grafana stacks
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  # Remote state backend – uncomment and configure for team usage
  # backend "s3" {
  #   bucket = "lojaveloz-tfstate"
  #   key    = "infra/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# ── Provider configuration ────────────────────────────────────────────────────
# Replace config_path with your kubeconfig, or use in-cluster auth on CI.
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.project_name
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# ── Namespace ─────────────────────────────────────────────────────────────────
resource "kubernetes_namespace" "lojaveloz" {
  metadata {
    name = var.project_name
    labels = {
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

# ── Secret – database password ────────────────────────────────────────────────
resource "kubernetes_secret" "db_password" {
  metadata {
    name      = "lojaveloz-secret"
    namespace = kubernetes_namespace.lojaveloz.metadata[0].name
  }

  data = {
    DB_PASSWORD = var.db_password
  }

  type = "Opaque"
}

# ── ConfigMap – shared environment variables ──────────────────────────────────
resource "kubernetes_config_map" "lojaveloz" {
  metadata {
    name      = "lojaveloz-config"
    namespace = kubernetes_namespace.lojaveloz.metadata[0].name
  }

  data = {
    DB_HOST      = "postgres"
    DB_PORT      = "5432"
    DB_NAME      = var.project_name
    DB_USER      = "postgres"
    RABBITMQ_URL = "amqp://guest:guest@rabbitmq:5672"
    ORDERS_URL   = "http://orders:3001"
    PAYMENTS_URL = "http://payments:3002"
    STOCK_URL    = "http://stock:3003"
  }
}

# ── Helm: Prometheus Stack (optional) ─────────────────────────────────────────
# Uncomment to deploy kube-prometheus-stack (Prometheus + Grafana + Alertmanager)
# resource "helm_release" "prometheus_stack" {
#   name             = "kube-prometheus-stack"
#   repository       = "https://prometheus-community.github.io/helm-charts"
#   chart            = "kube-prometheus-stack"
#   version          = "58.5.3"
#   namespace        = kubernetes_namespace.lojaveloz.metadata[0].name
#   create_namespace = false
#
#   set {
#     name  = "grafana.adminPassword"
#     value = "admin"
#   }
# }
