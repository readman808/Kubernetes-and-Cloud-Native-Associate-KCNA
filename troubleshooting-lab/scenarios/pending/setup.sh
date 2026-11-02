kubectl -n lab apply -f - <<Y
apiVersion: apps/v1
kind: Deployment
metadata: {name: worker}
spec:
  replicas: 1
  selector: {matchLabels: {app: worker}}
  template:
    metadata: {labels: {app: worker}}
    spec:
      containers:
      - name: w
        image: busybox:1.36
        command: ["sleep","3600"]
        resources:
          requests: {cpu: "64", memory: 512Gi}
Y
