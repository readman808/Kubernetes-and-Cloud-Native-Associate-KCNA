#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../../base/lib.sh"
bash "$BASE_DIR/up.sh"
kubectl -n "$NS" patch secret rabbitmq-secret --type merge -p '{"stringData":{"erlang-cookie":"ROTATEDCOOKIENOBODYTOLDYOU"}}' >/dev/null
kubectl -n "$NS" delete pod rabbitmq-2 --wait=false >/dev/null
sleep 30
