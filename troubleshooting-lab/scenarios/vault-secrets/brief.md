# App cannot read its secret from Vault
Vault (dev mode) runs in namespace `lab` as Service `vault`. The `billing` app should read
`secret/billing` and log `GOT SECRET`, but its logs show errors.
Tip: the Vault pod has the CLI; root token is `root`.
Goal: `kubectl logs deploy/billing` ends with GOT SECRET.
