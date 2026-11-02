kubectl -n lab apply -f - <<Y
apiVersion: apps/v1
kind: Deployment
metadata: {name: checkout}
spec:
  replicas: 2
  selector: {matchLabels: {app: checkout}}
  template:
    metadata: {labels: {app: checkout}}
    spec:
      containers:
      - name: web
        image: busybox:1.36
        command: ["sh","-c","test -n \"\$DB_URL\" || { echo 'DB_URL is required' >&2; exit 1; }; echo up; sleep 3600"]
Y
