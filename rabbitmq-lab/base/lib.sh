# Shared helpers, sourced by setup.sh / check.sh. Namespace comes from LAB_NS (set by lab.sh).
NS="${LAB_NS:-lab}"
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# rmq <pod> <command...>  : run a command inside a RabbitMQ pod
rmq() { local pod=$1; shift; kubectl -n "$NS" exec "$pod" -c rabbitmq -- "$@"; }

# Number of nodes in the cluster as seen from rabbitmq-0 (itself + connected peers)
cluster_size() { rmq rabbitmq-0 rabbitmqctl -q eval 'length([node()|nodes()]).' 2>/dev/null | tr -d '\r\n ' || true; }

wait_cluster() {
  local want=${1:-3} i
  for i in $(seq 1 100); do [ "$(cluster_size)" = "$want" ] && return 0; sleep 3; done
  echo "WARNING: cluster did not reach $want nodes; continuing anyway" >&2; return 0
}

# api METHOD PATH [json] : call the management HTTP API from a throwaway curl pod
api() {
  kubectl -n "$NS" run "api-$RANDOM" --rm -i --quiet --restart=Never --image=curlimages/curl:8.8.0 \
    --command -- curl -sf -u admin:labpass123 -X "$1" -H 'content-type: application/json' \
    "http://rabbitmq:15672/api/$2" ${3:+-d "$3"} >/dev/null
}

# perf_deploy <name> <password> <perf-test args...>  : a Deployment running RabbitMQ PerfTest as an "app"
# Args may reference $(RMQ_PASS), which Kubernetes expands from the container env.
perf_deploy() {
  local name=$1 pass=$2; shift 2
  local args; args=$(printf '        - "%s"\n' "$@")
  kubectl -n "$NS" apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata: {name: $name}
spec:
  replicas: 1
  selector: {matchLabels: {app: $name}}
  template:
    metadata: {labels: {app: $name}}
    spec:
      containers:
      - name: perf
        image: pivotalrabbitmq/perf-test:latest
        env:
        - {name: RMQ_PASS, value: "$pass"}
        args:
$args
EOF
}

fail() { echo "  - $*"; exit 1; }
