## Root cause
Two mistakes on Service `rabbitmq`: selector is `app: rabbit-mq` (pods are labelled `app: rabbitmq`) and the management port forwards to `15673` instead of `15672`.

## Diagnosis
    kubectl logs deploy/orders-app                  # amqp connect FAILED
    kubectl get endpoints rabbitmq                  # <none>
    kubectl get pods --show-labels                  # app=rabbitmq
    kubectl get svc rabbitmq -o jsonpath='{.spec.selector}'
    kubectl get endpoints rabbitmq                  # (after selector fix) ports 5672,15673 -> wrong

## Fix
    kubectl patch svc rabbitmq --type merge -p '{"spec":{"selector":{"app":"rabbitmq"},"ports":[{"name":"amqp","port":5672,"targetPort":5672},{"name":"management","port":15672,"targetPort":15672}]}}'
    kubectl port-forward svc/rabbitmq 15672   # UI at http://localhost:15672 (admin / labpass123)
