#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
for p in rabbitmq-0 rabbitmq-1 rabbitmq-2; do
  rmq "$p" rabbitmq-diagnostics -q check_local_alarms >/dev/null 2>&1 || fail "$p still has an alarm (or is not answering)"
done
