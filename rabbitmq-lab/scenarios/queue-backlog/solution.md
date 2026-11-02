## Root cause
The consumer's `RMQ_PASS` is `AppPass` (typo); the producer uses `AppPass1`. The consumer is refused at login, crash-loops, and the queue has 0 consumers so messages pile up (and memory with them).

## Diagnosis
    kubectl exec rabbitmq-0 -- rabbitmqctl list_queues name messages consumers   # orders  N  0
    kubectl get pods                                                           # consumer CrashLoopBackOff
    kubectl logs deploy/consumer                                               # ACCESS_REFUSED - Login was refused
    kubectl get deploy producer consumer -o yaml | grep -A1 RMQ_PASS

## Fix
    kubectl set env deploy/consumer RMQ_PASS=AppPass1
    kubectl exec rabbitmq-0 -- rabbitmqctl list_queues name messages consumers   # consumers=1, messages falling
Real-world follow-ups: alert on `consumers == 0`, store credentials in a Secret, set a queue `max-length`/TTL so a dead consumer cannot exhaust memory.
