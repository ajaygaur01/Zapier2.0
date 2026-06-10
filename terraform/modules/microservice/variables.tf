variable "service_name" {
  type        = string
  description = "The name of the service and deployment"
}

variable "namespace" {
  type        = string
  description = "The Kubernetes namespace to deploy resources into"
}

variable "image" {
  type        = string
  description = "The Docker image for the container"
}

variable "replicas" {
  type        = number
  description = "The number of replicas for the deployment"
  default     = 1
}

variable "container_port" {
  type        = number
  description = "The port the container is listening on"
}

variable "create_service" {
  type        = bool
  description = "Whether to create a Kubernetes Service for this deployment"
  default     = true
}

variable "service_port" {
  type        = number
  description = "The external port exposed by the service"
  default     = 80
}

variable "service_type" {
  type        = string
  description = "The Kubernetes Service type"
  default     = "ClusterIP"
}

variable "env_config" {
  type        = map(string)
  description = "Key-value pairs for the application ConfigMap"
  default     = {}
}

variable "env_secret" {
  type        = map(string)
  description = "Key-value pairs for the application Secret"
  default     = {}
  sensitive   = true
}

variable "cpu_request" {
  type        = string
  description = "CPU request limit for the container"
  default     = "100m"
}

variable "memory_request" {
  type        = string
  description = "Memory request limit for the container"
  default     = "128Mi"
}

variable "cpu_limit" {
  type        = string
  description = "CPU hard limit for the container"
  default     = "500m"
}

variable "memory_limit" {
  type        = string
  description = "Memory hard limit for the container"
  default     = "512Mi"
}

variable "service_annotations" {
  type        = map(string)
  description = "Annotations to apply to the Service metadata"
  default     = {}
}
