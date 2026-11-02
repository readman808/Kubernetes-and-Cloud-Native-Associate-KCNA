kubectl -n lab apply -f - <<Y
apiVersion: v1
kind: PersistentVolumeClaim
metadata: {name: vault-data}
spec:
  accessModes: [ReadWriteOnce]
  resources: {requests: {storage: 1Gi}}
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
metadata: {name: vault}
spec:
  replicas: 1
  strategy: {type: Recreate}
  selector: {matchLabels: {app: vault}}
  template:
    metadata: {labels: {app: vault}}
    spec:
      containers:
      - name: vault
        image: hashicorp/vault:1.17
        args: ["server"]
        env:
        - name: VAULT_LOCAL_CONFIG
          value: '{"storage":{"file":{"path":"/vault/file"}},"listener":{"tcp":{"address":"0.0.0.0:8200","tls_disable":true}},"disable_mlock":true,"ui":false}'
        ports: [{containerPort: 8200}]
        volumeMounts: [{name: data, mountPath: /vault/file}]
        readinessProbe:
          httpGet: {path: /v1/sys/health, port: 8200}
          periodSeconds: 5
        livenessProbe:
          httpGet: {path: "/v1/sys/health?sealedcode=200&uninitcode=200", port: 8201}
          initialDelaySeconds: 45
          periodSeconds: 10
          failureThreshold: 2
      volumes:
      - name: data
        persistentVolumeClaim: {claimName: vault-data}
Y
V="kubectl -n lab exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200"
for i in $(seq 1 40); do $V vault status >/dev/null 2>&1; [ $? -ne 1 ] && break; sleep 3; done
$V vault operator init -key-shares=3 -key-threshold=2 > /tmp/vault-init.txt
kubectl -n lab create secret generic vault-init --from-file=init.txt=/tmp/vault-init.txt
rm -f /tmp/vault-init.txt
