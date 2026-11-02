# Vault keeps sealing itself
Vault (server mode, file storage on a PVC) runs in namespace `lab` as Deployment/Service `vault`.
Apps report "Vault is sealed", and teammates say they unsealed it earlier but it locked again.
The unseal keys from initialization were saved in Secret `vault-init` (threshold: 2 of 3 keys).
Goal: Vault is unsealed AND stays that way (no more restarts).
Tip: run vault commands with `kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 vault <cmd>`.
