#!/usr/bin/env bash
source "$(dirname "$0")/../../base/lib.sh"
perm=$(rmq rabbitmq-0 rabbitmqctl -q list_permissions -p prod 2>/dev/null || true)
echo "$perm" | awk -F'\t' '$1=="orders-svc" && $3!="" && $3!="^$" {f=1} END{exit !f}' \
  || fail "user orders-svc has no usable permissions on vhost 'prod'"
kubectl -n "$NS" logs deploy/producer --tail=50 2>/dev/null | grep -q 'sent:' \
  || fail "permissions look right, but the producer is not publishing yet (skip the crash-loop back-off: kubectl rollout restart deploy/producer)"
