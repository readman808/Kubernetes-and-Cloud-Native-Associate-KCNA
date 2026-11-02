## Root cause
`rabbitmq.conf` (ConfigMap `rabbitmq-config`) sets `vm_memory_high_watermark.absolute = 20MB`. An idle RabbitMQ node uses more than that, so every node raises a memory alarm and blocks all publishing connections.

## Diagnosis
    kubectl exec rabbitmq-0 -- rabbitmq-diagnostics alarms          # memory resource limit alarm
    kubectl exec rabbitmq-0 -- rabbitmqctl list_connections name state   # blocked / blocking
    kubectl get cm rabbitmq-config -o jsonpath='{.data.rabbitmq\.conf}'

## Fix (quick, temporary - repeat for rabbitmq-1 and rabbitmq-2)
    kubectl exec rabbitmq-0 -- rabbitmqctl set_vm_memory_high_watermark 0.4

## Fix (durable)
    kubectl edit cm rabbitmq-config      # replace the absolute line with: vm_memory_high_watermark.relative = 0.4
    kubectl rollout restart sts/rabbitmq
    kubectl rollout status sts/rabbitmq
Pods restart one at a time (reverse ordinal); the cluster stays available because queues are not pinned to a single node here. Mind the Kubernetes limit: watermark is relative to the memory RabbitMQ detects (the cgroup limit), so 0.4 of 768Mi is about 300MB.
