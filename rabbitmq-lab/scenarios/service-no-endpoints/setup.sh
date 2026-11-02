#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
bash "$BASE_DIR/up.sh"
kubectl -n "$NS" patch svc rabbitmq --type merge -p '{"spec":{"selector":{"app":"rabbit-mq"},"ports":[{"name":"amqp","port":5672,"targetPort":5672},{"name":"management","port":15672,"targetPort":15673}]}}' >/dev/null
kubectl -n "$NS" apply -f - >/dev/null <<Y
apiVersion: apps/v1
kind: Deployment
metadata: {name: orders-app}
spec:
  replicas: 1
  selector: {matchLabels: {app: orders-app}}
  template:
    metadata: {labels: {app: orders-app}}
    spec:
      containers:
      - name: app
        image: busybox:1.36
        command: ["sh","-c","while true; do if nc -z -w2 rabbitmq 5672; then echo 'amqp connect OK'; else echo 'amqp connect FAILED'; fi; sleep 5; done"]
Y
kubectl -n "$NS" rollout status deploy/orders-app --timeout=120s >/dev/null
