# Clients cannot reach RabbitMQ through its Service
**Severity: SEV-2 | Difficulty: easy**

The RabbitMQ cluster (3 replicas, StatefulSet `rabbitmq`) was recently touched during a "Service cleanup" change. All three pods look healthy and the cluster is formed, but the `orders-app` deployment keeps logging `amqp connect FAILED`, and nobody can open the management UI through the Service.

Your job: find out why traffic sent to Service `rabbitmq` never reaches the brokers, and fix it so that **both** AMQP (5672) and the management UI (15672) work through the Service, backed by all 3 pods.
