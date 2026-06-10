# Create the target namespace
resource "kubernetes_namespace" "zapier" {
  metadata {
    name = var.namespace
  }
}

# -----------------------------------------------------------------------------
# DATABASE: PostgreSQL
# -----------------------------------------------------------------------------
resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.zapier.metadata[0].name
  }

  spec {
    service_name = "postgres-service"
    replicas     = 1

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:15"

          port {
            container_port = 5432
          }

          env {
            name  = "POSTGRES_USER"
            value = "postgres"
          }

          env {
            name  = "POSTGRES_PASSWORD"
            value = "postgres"
          }

          env {
            name  = "POSTGRES_DB"
            value = "zapier"
          }

          volume_mount {
            name       = "postgres-data"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "postgres-data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "5Gi"
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "postgres_service" {
  metadata {
    name      = "postgres-service"
    namespace = kubernetes_namespace.zapier.metadata[0].name
    annotations = {
      "prometheus.io/scrape" = "true"
      "prometheus.io/port"   = "5432"
    }
  }

  spec {
    selector = {
      app = "postgres"
    }

    port {
      protocol    = "TCP"
      port        = 5432
      target_port = 5432
    }
  }
}

# -----------------------------------------------------------------------------
# DATABASE: Redis
# -----------------------------------------------------------------------------
resource "kubernetes_stateful_set" "redis" {
  metadata {
    name      = "redis"
    namespace = kubernetes_namespace.zapier.metadata[0].name
  }

  spec {
    service_name = "redis-service"
    replicas     = 1

    selector {
      match_labels = {
        app = "redis"
      }
    }

    template {
      metadata {
        labels = {
          app = "redis"
        }
      }

      spec {
        container {
          name  = "redis"
          image = "redis:alpine"

          port {
            container_port = 6379
          }

          volume_mount {
            name       = "redis-data"
            mount_path = "/data"
          }

          command = ["redis-server", "--appendonly", "yes"]
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "redis-data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "1Gi"
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "redis_service" {
  metadata {
    name      = "redis-service"
    namespace = kubernetes_namespace.zapier.metadata[0].name
  }

  spec {
    selector = {
      app = "redis"
    }

    port {
      protocol    = "TCP"
      port        = 6379
      target_port = 6379
    }
  }
}

# -----------------------------------------------------------------------------
# INFRASTRUCTURE: Strimzi Kafka (CRDs via kubernetes_manifest)
# -----------------------------------------------------------------------------
resource "kubernetes_manifest" "kafka_nodepool" {
  manifest = {
    apiVersion = "kafka.strimzi.io/v1"
    kind       = "KafkaNodePool"
    metadata = {
      name      = "kafka-pool"
      namespace = kubernetes_namespace.zapier.metadata[0].name
      labels = {
        "strimzi.io/cluster" = "zapier-kafka"
      }
    }
    spec = {
      replicas = 1
      roles    = ["broker", "controller"]
      storage = {
        type = "ephemeral"
      }
    }
  }
}

resource "kubernetes_manifest" "kafka_cluster" {
  manifest = {
    apiVersion = "kafka.strimzi.io/v1"
    kind       = "Kafka"
    metadata = {
      name      = "zapier-kafka"
      namespace = kubernetes_namespace.zapier.metadata[0].name
      annotations = {
        "strimzi.io/node-pools" = "enabled"
        "strimzi.io/kraft"      = "enabled"
      }
    }
    spec = {
      kafka = {
        version         = "4.1.0"
        metadataVersion = "4.1-IV0"
        listeners = [
          {
            name = "plain"
            port = 9092
            type = "internal"
            tls  = false
          }
        ]
        config = {
          "offsets.topic.replication.factor"         = 1
          "transaction.state.log.replication.factor" = 1
          "transaction.state.log.min.isr"            = 1
          "default.replication.factor"               = 1
          "min.insync.replicas"                      = 1
        }
      }
      entityOperator = {
        topicOperator = {}
        userOperator  = {}
      }
    }
  }

  depends_on = [kubernetes_manifest.kafka_nodepool]
}

resource "kubernetes_manifest" "kafka_topic_events" {
  manifest = {
    apiVersion = "kafka.strimzi.io/v1"
    kind       = "KafkaTopic"
    metadata = {
      name      = "zap-events"
      namespace = kubernetes_namespace.zapier.metadata[0].name
      labels = {
        "strimzi.io/cluster" = "zapier-kafka"
      }
    }
    spec = {
      partitions = 3
      replicas   = 1
      config = {
        "retention.ms"  = "604800000"
        "segment.bytes" = "1073741824"
      }
    }
  }

  depends_on = [kubernetes_manifest.kafka_cluster]
}

resource "kubernetes_manifest" "kafka_topic_dlq" {
  manifest = {
    apiVersion = "kafka.strimzi.io/v1"
    kind       = "KafkaTopic"
    metadata = {
      name      = "zap-events-dlq"
      namespace = kubernetes_namespace.zapier.metadata[0].name
      labels = {
        "strimzi.io/cluster" = "zapier-kafka"
      }
    }
    spec = {
      partitions = 3
      replicas   = 1
      config = {
        "retention.ms"  = "604800000"
        "segment.bytes" = "1073741824"
      }
    }
  }

  depends_on = [kubernetes_manifest.kafka_cluster]
}

# -----------------------------------------------------------------------------
# MICROSERVICES: 7 Applications using the reusable microservice module
# -----------------------------------------------------------------------------

module "backend" {
  source = "./modules/microservice"

  service_name   = "backend"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/primarybackend:latest"
  replicas       = 2
  container_port = 3000
  service_port   = 80

  env_config = {
    REDIS_HOST    = "redis-service"
    REDIS_PORT    = "6379"
    KAFKA_BROKER  = "zapier-kafka-kafka-bootstrap.${kubernetes_namespace.zapier.metadata[0].name}.svc.cluster.local:9092"
    SMTP_ENDPOINT = "smtp.resend.com"
    SMTP_USERNAME = "resend"
    SMTP_FROM     = "onboarding@resend.dev"
    RESEND_FROM   = "onboarding@resend.dev"
  }

  env_secret = {
    DATABASE_URL      = var.database_url
    RESEND_API_KEY    = var.resend_api_key
    SMTP_PASSWORD     = var.smtp_password
    SOL_PRIVATE_KEY   = var.sol_private_key
    SLACK_BOT_TOKEN   = var.slack_bot_token
    SLACK_WEBHOOK_URL = var.slack_webhook_url
  }

  service_annotations = {
    "prometheus.io/scrape" = "true"
    "prometheus.io/port"   = "3000"
  }

  depends_on = [
    kubernetes_stateful_set.postgres,
    kubernetes_stateful_set.redis
  ]
}

module "frontend" {
  source = "./modules/microservice"

  service_name   = "frontend"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/frontend:latest"
  replicas       = 1
  container_port = 3001
  service_port   = 3001

  env_config = {
    NEXT_PUBLIC_BACKEND_URL = ""
    NEXT_PUBLIC_HOOKS_URL   = ""
  }

  service_annotations = {
    "prometheus.io/scrape" = "true"
    "prometheus.io/port"   = "3001"
  }
}

module "hooks" {
  source = "./modules/microservice"

  service_name   = "hooks"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/hooks:latest"
  replicas       = 2
  container_port = 8000
  service_port   = 80

  env_config = {
    REDIS_HOST    = "redis-service"
    REDIS_PORT    = "6379"
    KAFKA_BROKER  = "zapier-kafka-kafka-bootstrap.${kubernetes_namespace.zapier.metadata[0].name}.svc.cluster.local:9092"
    SMTP_ENDPOINT = "smtp.resend.com"
    SMTP_USERNAME = "resend"
    SMTP_FROM     = "onboarding@resend.dev"
    RESEND_FROM   = "onboarding@resend.dev"
  }

  env_secret = {
    DATABASE_URL   = var.database_url
    RESEND_API_KEY = var.resend_api_key
    SMTP_PASSWORD  = var.smtp_password
  }

  service_annotations = {
    "prometheus.io/scrape" = "true"
    "prometheus.io/port"   = "8000"
  }

  depends_on = [
    kubernetes_stateful_set.postgres,
    kubernetes_stateful_set.redis
  ]
}

module "processor" {
  source = "./modules/microservice"

  service_name   = "processor"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/processor:latest"
  replicas       = 1
  container_port = 8080 # Dummy port as it has no listener
  create_service = false

  env_config = {
    KAFKA_BROKER = "zapier-kafka-kafka-bootstrap.${kubernetes_namespace.zapier.metadata[0].name}.svc.cluster.local:9092"
  }

  env_secret = {
    DATABASE_URL = var.database_url
  }

  depends_on = [
    kubernetes_stateful_set.postgres,
    kubernetes_manifest.kafka_cluster
  ]
}

module "worker" {
  source = "./modules/microservice"

  service_name   = "worker"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/worker:latest"
  replicas       = 1
  container_port = 8080 # Dummy port
  create_service = false

  env_config = {
    REDIS_HOST   = "redis-service"
    REDIS_PORT   = "6379"
    KAFKA_BROKER = "zapier-kafka-kafka-bootstrap.${kubernetes_namespace.zapier.metadata[0].name}.svc.cluster.local:9092"
  }

  env_secret = {
    DATABASE_URL = var.database_url
  }

  depends_on = [
    kubernetes_stateful_set.postgres,
    kubernetes_stateful_set.redis,
    kubernetes_manifest.kafka_cluster
  ]
}

module "notification" {
  source = "./modules/microservice"

  service_name   = "notification"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/notification-service:latest"
  replicas       = 1
  container_port = 9000
  service_port   = 9000

  env_config = {
    REDIS_HOST = "redis-service"
    REDIS_PORT = "6379"
    PORT       = "9000"
  }

  service_annotations = {
    "prometheus.io/scrape" = "true"
    "prometheus.io/port"   = "9000"
  }

  depends_on = [
    kubernetes_stateful_set.redis
  ]
}

module "scheduler" {
  source = "./modules/microservice"

  service_name   = "scheduler"
  namespace      = kubernetes_namespace.zapier.metadata[0].name
  image          = "ajaygaur0103/scheduler:latest"
  replicas       = 1
  container_port = 8080 # Dummy port
  create_service = false

  env_config = {
    REDIS_HOST = "redis-service"
    REDIS_PORT = "6379"
  }

  env_secret = {
    DATABASE_URL = var.database_url
  }

  depends_on = [
    kubernetes_stateful_set.postgres,
    kubernetes_stateful_set.redis
  ]
}

# -----------------------------------------------------------------------------
# NETWORKING: Ingress
# -----------------------------------------------------------------------------
resource "kubernetes_ingress_v1" "ingress" {
  metadata {
    name      = "zapier-ingress"
    namespace = kubernetes_namespace.zapier.metadata[0].name
    annotations = {
      "nginx.ingress.kubernetes.io/ssl-redirect" = "false"
      "nginx.ingress.kubernetes.io/use-regex"    = "true"
    }
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = var.ingress_host

      http {
        path {
          path      = "/api"
          path_type = "Prefix"
          backend {
            service {
              name = module.backend.service_name
              port {
                number = module.backend.service_port
              }
            }
          }
        }

        path {
          path      = "/hooks"
          path_type = "Prefix"
          backend {
            service {
              name = module.hooks.service_name
              port {
                number = module.hooks.service_port
              }
            }
          }
        }

        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = module.frontend.service_name
              port {
                number = module.frontend.service_port
              }
            }
          }
        }
      }
    }
  }
}

# -----------------------------------------------------------------------------
# HELM RELEASE: Prometheus Stack (Optional)
# -----------------------------------------------------------------------------
resource "helm_release" "prometheus_stack" {
  count      = var.enable_monitoring ? 1 : 0
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.zapier.metadata[0].name

  values = [
    file("${path.module}/../k8/monitoringk8/values.yaml")
  ]
}
