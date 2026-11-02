#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
row=$(rmq rabbitmq-0 rabbitmqctl -q list_queues -p / name messages consumers 2>/dev/null | awk '$1=="orders"{print $2" "$3}')
[ -n "$row" ] || fail "queue 'orders' not found (is the producer still running?)"
set -- $row
[ "$2" -ge 1 ] || fail "queue 'orders' has $1 messages and 0 consumers"
kubectl -n "$NS" get deploy producer >/dev/null 2>&1 || fail "producer was removed; it must keep running"
