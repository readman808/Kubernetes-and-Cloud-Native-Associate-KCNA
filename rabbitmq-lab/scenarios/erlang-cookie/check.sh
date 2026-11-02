#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
want=$(kubectl -n "$NS" get secret rabbitmq-secret -o jsonpath='{.data.erlang-cookie}' | base64 -d)
have0=$(rmq rabbitmq-0 cat /var/lib/rabbitmq/.erlang.cookie 2>/dev/null | tr -d '\r\n' || true)
[ "$want" = "$have0" ] || fail "Secret cookie differs from the cookie rabbitmq-0 is running with"
ready=$(kubectl -n "$NS" get sts rabbitmq -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
[ "${ready:-0}" = "3" ] || fail "StatefulSet has ${ready:-0}/3 ready replicas"
[ "$(cluster_size)" = "3" ] || fail "RabbitMQ cluster has $(cluster_size) of 3 nodes"
r0=$(kubectl -n "$NS" get pod rabbitmq-0 -o jsonpath='{.status.containerStatuses[0].restartCount}')
r1=$(kubectl -n "$NS" get pod rabbitmq-1 -o jsonpath='{.status.containerStatuses[0].restartCount}')
[ "$r0$r1" = "00" ] || fail "rabbitmq-0/1 were restarted (restart counts $r0/$r1) - you were asked not to"
