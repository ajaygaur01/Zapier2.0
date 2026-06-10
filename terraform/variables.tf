variable "kube_config_path" {
  type        = string
  description = "Path to the kubeconfig file"
  default     = "~/.kube/config"
}

variable "kube_config_context" {
  type        = string
  description = "Kubernetes context to use"
  default     = "minikube"
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace for deploying applications"
  default     = "zapier"
}

variable "ingress_host" {
  type        = string
  description = "The ingress host domain"
  default     = "zapier.local"
}

variable "enable_monitoring" {
  type        = bool
  description = "Whether to deploy the kube-prometheus-stack Helm chart for monitoring"
  default     = false
}

# Secrets variables (will be masked in outputs)
variable "database_url" {
  type        = string
  description = "Connection URL for the PostgreSQL database"
  sensitive   = true
  default     = "postgresql://postgres:postgres@postgres-service:5432/zapier"
}

variable "resend_api_key" {
  type        = string
  description = "API Key for Resend service"
  sensitive   = true
}

variable "smtp_password" {
  type        = string
  description = "Password for SMTP authentication"
  sensitive   = true
}

variable "sol_private_key" {
  type        = string
  description = "Private key for Solana integration"
  sensitive   = true
}

variable "slack_bot_token" {
  type        = string
  description = "Bot token for Slack notifications"
  sensitive   = true
}

variable "slack_webhook_url" {
  type        = string
  description = "Webhook URL for Slack channel notifications"
  sensitive   = true
}

