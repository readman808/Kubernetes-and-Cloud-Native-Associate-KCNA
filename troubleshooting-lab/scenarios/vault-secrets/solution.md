kubectl -n lab set env deploy/billing VAULT_ADDR=http://vault:8200
kubectl -n lab exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root vault kv put secret/billing api_key=abc123
