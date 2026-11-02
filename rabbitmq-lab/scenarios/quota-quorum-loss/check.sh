#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
ready=$(kubectl -n "$NS" get sts rabbitmq -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
[ "${ready:-0}" = "3" ] || fail "StatefulSet has ${ready:-0}/3 ready replicas"
[ "$(cluster_size)" = "3" ] || fail "RabbitMQ cluster has $(cluster_size) of 3 nodes"
online=$(rmq rabbitmq-0 rabbitmqctl -q list_queues name online 2>/dev/null | awk '$1=="payments"{print $2}' | tr -d '[]' | tr ',' ' ' | wc -w)
[ "$online" -ge 3 ] || fail "quorum queue 'payments' has only $online members online"
kubectl -n "$NS" get pvc data-rabbitmq-1 data-rabbitmq-2 >/dev/null 2>&1 || fail "PVCs were deleted - data loss is not an acceptable fix"
