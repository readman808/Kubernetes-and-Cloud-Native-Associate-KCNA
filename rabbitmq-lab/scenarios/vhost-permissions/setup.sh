#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
bash "$BASE_DIR/up.sh"
rmq rabbitmq-0 rabbitmqctl -q add_vhost prod
rmq rabbitmq-0 rabbitmqctl -q add_user orders-svc 'S3cretPass'
rmq rabbitmq-0 rabbitmqctl -q set_permissions -p / orders-svc '.*' '.*' '.*'
perf_deploy producer 'S3cretPass' --uri 'amqp://orders-svc:$(RMQ_PASS)@rabbitmq:5672/prod' -x 1 -y 0 -u orders-prod -ad false -r 10
