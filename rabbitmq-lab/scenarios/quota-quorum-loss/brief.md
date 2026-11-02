# Only 1 of 3 RabbitMQ pods is running and the payments queue is unavailable
**Severity: SEV-1 | Difficulty: hard**

During a node maintenance window two RabbitMQ pods (`rabbitmq-1`, `rabbitmq-2`) were deleted, as is routine for a StatefulSet - Kubernetes should simply recreate them. It did not. Only `rabbitmq-0` is up. The `payments` queue is a **quorum queue** with 3 members; the payments team reports publishes time out and consumers stall.

Your job: find out why the StatefulSet cannot recreate its pods, fix the root cause, and bring the cluster back to 3 healthy members **without losing data** (do not delete PVCs or reset nodes).
