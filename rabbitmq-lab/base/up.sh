#!/usr/bin/env bash
# Brings up the healthy 3-replica RabbitMQ cluster. Optional: EXTRA_CONF="line\nline" appended to rabbitmq.conf.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
CONF=$(mktemp); trap 'rm -f "$CONF"' EXIT
cat "$BASE_DIR/rabbitmq.conf" > "$CONF"
[ -n "${EXTRA_CONF:-}" ] && printf '%s\n' "$EXTRA_CONF" >> "$CONF"
kubectl -n "$NS" create configmap rabbitmq-config \
  --from-file=rabbitmq.conf="$CONF" --from-file=enabled_plugins="$BASE_DIR/enabled_plugins" \
  --dry-run=client -o yaml | kubectl -n "$NS" apply -f - >/dev/null
kubectl -n "$NS" apply -f "$BASE_DIR/rabbitmq.yaml" >/dev/null
echo "Starting 3-node RabbitMQ cluster (first run pulls images; can take a few minutes)..."
kubectl -n "$NS" rollout status sts/rabbitmq --timeout=480s
wait_cluster 3
