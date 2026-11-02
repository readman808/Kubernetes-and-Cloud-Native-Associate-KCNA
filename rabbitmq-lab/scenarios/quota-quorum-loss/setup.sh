#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
bash "$BASE_DIR/up.sh"
api PUT 'queues/%2F/payments' '{"durable":true,"auto_delete":false,"arguments":{"x-queue-type":"quorum"}}'
kubectl -n "$NS" create quota lab-quota --hard=pods=1 >/dev/null
kubectl -n "$NS" delete pod rabbitmq-1 rabbitmq-2 --wait=false >/dev/null
sleep 20
