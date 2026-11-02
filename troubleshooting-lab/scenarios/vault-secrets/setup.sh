kubectl -n lab apply -f - <<Y
apiVersion: apps/v1
kind: Deployment
metadata: {name: vault}
spec:
  selector: {matchLabels: {app: vault}}
  template:
    metadata: {labels: {app: vault}}
    spec:
      containers:
      - name: vault
        image: hashicorp/vault:1.17
        env:
        - {name: VAULT_DEV_ROOT_TOKEN_ID, value: root}
        - {name: VAULT_DEV_LISTEN_ADDRESS, value: "0.0.0.0:8200"}
        ports: [{containerPort: 8200}]
---
apiVersion: v1
kind: Service
metadata: {name: vault}
spec:
  selector: {app: vault}
  ports: [{port: 8200}]
---
apiVersion: apps/v1
kind: Deployment
metadata: {name: billing}
spec:
  selector: {matchLabels: {app: billing}}
  template:
    metadata: {labels: {app: billing}}
    spec:
      containers:
      - name: app
        image: curlimages/curl:8.8.0
        env:
        - {name: VAULT_ADDR, value: "http://vault-server:8200"}
        - {name: VAULT_TOKEN, value: root}
        command: ["sh","-c"]
        args:
        - |
          while true; do
            out=\$(curl -s -m 3 -H "X-Vault-Token: \$VAULT_TOKEN" \$VAULT_ADDR/v1/secret/data/billing) || { echo "cannot reach \$VAULT_ADDR"; sleep 5; continue; }
            case "\$out" in *api_key*) echo "GOT SECRET";; *) echo "no secret: \$out";; esac
            sleep 5
          done
Y
kubectl -n lab rollout status deploy/vault --timeout=120s
