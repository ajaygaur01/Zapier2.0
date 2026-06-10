output "service_name" {
  description = "The name of the Kubernetes service"
  value       = var.create_service ? kubernetes_service.service[0].metadata[0].name : ""
}

output "service_port" {
  description = "The port exposed by the service"
  value       = var.create_service ? kubernetes_service.service[0].spec[0].port[0].port : null
}

output "deployment_name" {
  description = "The name of the Kubernetes deployment"
  value       = kubernetes_deployment.deployment.metadata[0].name
}
