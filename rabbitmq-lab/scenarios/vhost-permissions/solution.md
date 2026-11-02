## Root cause
Permissions in RabbitMQ are per vhost. `orders-svc` can use `/` only; it has nothing on `prod`, so the broker answers `NOT_ALLOWED - access to vhost 'prod' refused for user 'orders-svc'` even though the password is right.

## Diagnosis
    kubectl logs deploy/producer
    kubectl exec rabbitmq-0 -- rabbitmqctl list_user_permissions orders-svc    # only vhost /
    kubectl exec rabbitmq-0 -- rabbitmqctl list_permissions -p prod            # empty

## Fix
    kubectl exec rabbitmq-0 -- rabbitmqctl set_permissions -p prod orders-svc ".*" ".*" ".*"
    kubectl rollout restart deploy/producer
    kubectl logs deploy/producer --tail=3          # sent: 10 msg/s
Least privilege: prefer narrow patterns such as `"^orders-.*"` over `".*"` in real life.
