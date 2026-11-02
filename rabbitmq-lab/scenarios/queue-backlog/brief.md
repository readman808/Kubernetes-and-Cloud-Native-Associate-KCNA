# The `orders` queue keeps growing and nothing consumes it
**Severity: SEV-2 | Difficulty: medium**

Order confirmations stopped going out. The producer is healthy and publishing about 50 msg/s to queue `orders`, but the message count only goes up, and the on-call dashboard shows the broker's memory creeping higher. The `consumer` Deployment is supposedly running.

Your job: find why the queue has no working consumer, and fix it so `orders` has at least one consumer and the backlog drains. Do not stop the producer.
