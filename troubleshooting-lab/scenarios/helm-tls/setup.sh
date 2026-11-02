command -v helm >/dev/null || { echo "helm required"; exit 1; }
helm install gateway "$(dirname "$0")/chart" -n lab --set tls.secretName=gateway-tls-v2
