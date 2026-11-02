# Publishers are blocked by a memory alarm on every node
**Severity: SEV-1 | Difficulty: medium**

Since the last config change, every application that publishes to RabbitMQ hangs. The management UI shows red "memory alarm" badges and connections stuck in `blocked`. Pods are all `Running` and `Ready`, and the Kubernetes memory limit is 768Mi with plenty of headroom - nobody is OOM-killed.

Your job: find what is raising the alarm, and clear it on **all three** nodes so publishers resume. Think about whether your fix survives a pod restart.
