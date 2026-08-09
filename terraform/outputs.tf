# ─────────────────────────────────────────────────────────────────────────────
# Outputs – values surfaced after `terraform apply`
# ─────────────────────────────────────────────────────────────────────────────

output "namespace" {
  description = "Kubernetes namespace where Loja Veloz is deployed"
  value       = kubernetes_namespace.lojaveloz.metadata[0].name
}

output "configmap_name" {
  description = "Name of the shared ConfigMap"
  value       = kubernetes_config_map.lojaveloz.metadata[0].name
}

output "secret_name" {
  description = "Name of the Secret holding database credentials"
  value       = kubernetes_secret.db_password.metadata[0].name
}

output "gateway_nodeport" {
  description = "NodePort through which the API Gateway is reachable externally"
  value       = 30007
}

output "grafana_nodeport" {
  description = "NodePort through which Grafana is reachable externally"
  value       = 30004
}
