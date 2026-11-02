V="kubectl -n lab exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200"
$V vault status 2>/dev/null | grep -Eq '^Sealed +false' || { echo "Vault is still sealed"; exit 1; }
port=$(kubectl -n lab get deploy vault -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.httpGet.port}')
[ "$port" = "8200" ] || { echo "Vault is unsealed but will be killed again: look at the liveness probe"; exit 1; }
