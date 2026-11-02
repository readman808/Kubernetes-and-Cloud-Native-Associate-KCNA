kubectl -n lab create deployment api --image=nginx:1.27-alpine --replicas=2
kubectl -n lab apply -f - <<Y
apiVersion: v1
kind: Service
metadata: {name: api}
spec:
  selector: {app: api-server}
  ports: [{port: 80, targetPort: 8080}]
Y
kubectl -n lab rollout status deploy/api --timeout=90s
