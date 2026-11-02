#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
ips=$(kubectl -n "$NS" get endpoints rabbitmq -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || true)
ports=" $(kubectl -n "$NS" get endpoints rabbitmq -o jsonpath='{.subsets[*].ports[*].port}' 2>/dev/null || true) "
[ "$(wc -w <<<"$ips")" -eq 3 ] || fail "Service rabbitmq has $(wc -w <<<"$ips") ready endpoints, expected 3"
[[ "$ports" == *" 5672 "* ]]  || fail "Service does not forward to AMQP port 5672"
[[ "$ports" == *" 15672 "* ]] || fail "Service does not forward to management port 15672"
[[ "$ports" != *" 15673 "* ]] || fail "Service still forwards to a port RabbitMQ does not listen on"
