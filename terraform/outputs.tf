output "namespace" {
  description = "The namespace where the application is deployed"
  value       = kubernetes_namespace.zapier.metadata[0].name
}

output "ingress_url" {
  description = "The URL to access the application via Ingress"
  value       = "http://${var.ingress_host}"
}

output "backend_service" {
  description = "The name of the backend service"
  value       = module.backend.service_name
}

output "frontend_service" {
  description = "The name of the frontend service"
  value       = module.frontend.service_name
}

output "hooks_service" {
  description = "The name of the hooks service"
  value       = module.hooks.service_name
}

output "notification_service" {
  description = "The name of the notification service"
  value       = module.notification.service_name
}
