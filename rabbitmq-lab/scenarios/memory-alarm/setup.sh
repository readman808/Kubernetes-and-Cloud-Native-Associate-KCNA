#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
EXTRA_CONF='vm_memory_high_watermark.absolute = 20MB' bash "$BASE_DIR/up.sh"
rmq rabbitmq-0 rabbitmqctl -q add_user app 'AppPass1'
rmq rabbitmq-0 rabbitmqctl -q set_permissions -p / app '.*' '.*' '.*'
perf_deploy producer 'AppPass1' --uri 'amqp://app:$(RMQ_PASS)@rabbitmq:5672' -x 1 -y 0 -u events -ad false -r 100
sleep 10
