1. Fix the cause of the restarts:
   kubectl -n lab patch deploy vault --type json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/port","value":8200}]'
2. Read the keys: kubectl -n lab get secret vault-init -o jsonpath='{.data.init\.txt}' | base64 -d
3. Unseal twice (new pod is sealed after the rollout):
   kubectl -n lab exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal <key1>
   kubectl -n lab exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal <key2>
Lesson: Vault seals on every restart unless auto-unseal (cloud KMS / transit) is configured. Find out WHY it restarts, not just how to unseal.
