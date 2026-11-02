#!/usr/bin/env bash
# RabbitMQ troubleshooting lab: breaks a real 3-replica RabbitMQ cluster on kind, you fix it.
set -euo pipefail
cd "$(dirname "$0")"
CLUSTER=rabbitmq-lab
NS=lab
export LAB_NS=$NS
CTX="kind-$CLUSTER"

need() { command -v "$1" >/dev/null || { echo "Missing required tool: $1"; exit 1; }; }
scen() { [ -d "scenarios/${1:-}" ] || { echo "Unknown scenario '${1:-}'. Run: ./lab.sh list"; exit 1; }; }
state() { cat .current 2>/dev/null || true; }

case "${1:-help}" in
  list)
    for d in scenarios/*/; do n=$(basename "$d"); printf '%-22s %s\n' "$n" "$(head -1 "$d/brief.md" | sed 's/^# //')"; done ;;
  start)
    need kind; need kubectl; need docker; scen "${2:-}"
    kind get clusters | grep -qx "$CLUSTER" || kind create cluster --name "$CLUSTER" --wait 120s
    kubectl config use-context "$CTX" >/dev/null
    kubectl delete ns "$NS" --ignore-not-found --wait=true >/dev/null
    kubectl create ns "$NS" >/dev/null
    kubectl config set-context --current --namespace="$NS" >/dev/null
    bash "scenarios/$2/setup.sh"
    echo "$2" > .current; rm -f .hints; date +%s > .started
    echo; echo "================ INCIDENT ================"; cat "scenarios/$2/brief.md"
    echo "=========================================="
    echo "Namespace: $NS (already your default). RabbitMQ pods: rabbitmq-0/1/2 (container: rabbitmq)."
    echo "Fix it, then run: ./lab.sh check" ;;
  brief)  scen "$(state)"; cat "scenarios/$(state)/brief.md" ;;
  status) kubectl -n "$NS" get pods,svc,sts -o wide ;;
  hint)
    scen "$(state)"; n=$(( $(cat .hints 2>/dev/null || echo 0) + 1 ))
    h=$(sed -n "${n}p" "scenarios/$(state)/hints.txt")
    if [ -z "$h" ]; then echo "No more hints. Try: ./lab.sh solution"; else echo "$n" > .hints; echo "Hint $n: $h"; fi ;;
  check)
    scen "$(state)"; need kubectl
    if bash "scenarios/$(state)/check.sh"; then
      el=$(( $(date +%s) - $(cat .started 2>/dev/null || date +%s) ))
      echo "PASS: incident resolved in $((el/60))m$((el%60))s. Hints used: $(cat .hints 2>/dev/null || echo 0)"
    else echo "NOT YET: keep investigating (./lab.sh hint if stuck)"; exit 1; fi ;;
  solution) scen "$(state)"; cat "scenarios/$(state)/solution.md" ;;
  stop) kind delete cluster --name "$CLUSTER"; rm -f .current .hints .started ;;
  *) cat <<USAGE
Usage: ./lab.sh <command>
  list              show scenarios
  start <scenario>  (re)create the incident
  brief | status | hint | check | solution
  stop              delete the kind cluster
USAGE
  ;;
esac
