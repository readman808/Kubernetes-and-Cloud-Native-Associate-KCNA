#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
bash "$BASE_DIR/up.sh"
rmq rabbitmq-0 rabbitmqctl -q add_user app 'AppPass1'
rmq rabbitmq-0 rabbitmqctl -q set_permissions -p / app '.*' '.*' '.*'
perf_deploy producer 'AppPass1' --uri 'amqp://app:$(RMQ_PASS)@rabbitmq:5672' -x 1 -y 0 -u orders -ad false -r 50
perf_deploy consumer 'AppPass'  --uri 'amqp://app:$(RMQ_PASS)@rabbitmq:5672' -x 0 -y 1 -u orders -ad false
sleep 15
