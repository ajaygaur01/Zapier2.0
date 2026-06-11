resource "kubernetes_config_map" "config" {
  count = length(var.env_config) > 0 ? 1 : 0

  metadata {
    name      = "${var.service_name}-config"
    namespace = var.namespace
  }

  data = var.env_config
}

resource "kubernetes_secret" "secret" {
  count = length(var.env_secret) > 0 ? 1 : 0

  metadata {
    name      = "${var.service_name}-secret"
    namespace = var.namespace
  }

  type = "Opaque"
  data = var.env_secret
}

resource "kubernetes_deployment" "deployment" {
  metadata {
    name      = "${var.service_name}-deployment"
    namespace = var.namespace
    labels = {
      app = var.service_name
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.service_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.service_name
        }
      }

      spec {
        container {
          name  = var.service_name
          image = var.image

          port {
            container_port = var.container_port
          }

          dynamic "env_from" {
            for_each = length(var.env_config) > 0 ? toset(["config"]) : toset([])
            content {
              config_map_ref {
                name = kubernetes_config_map.config[0].metadata[0].name
              }
            }
          }

          dynamic "env_from" {
            for_each = length(var.env_secret) > 0 ? toset(["secret"]) : toset([])
            content {
              secret_ref {
                name = kubernetes_secret.secret[0].metadata[0].name
              }
            }
          }

          resources {
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "service" {
  count = var.create_service ? 1 : 0

  metadata {
    name        = "${var.service_name}-service"
    namespace   = var.namespace
    annotations = var.service_annotations
  }

  spec {
    selector = {
      app = var.service_name
    }

    port {
      protocol    = "TCP"
      port        = var.service_port
      target_port = var.container_port
    }

    type = var.service_type
  }
}
