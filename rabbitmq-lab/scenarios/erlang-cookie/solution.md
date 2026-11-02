## Root cause
The Secret's cookie was changed, but a cookie is read only when a node starts. `rabbitmq-0/1` still run with the old cookie; the recreated `rabbitmq-2` writes the new one from the env var into `/var/lib/rabbitmq/.erlang.cookie`. Erlang distribution refuses connections between nodes with different cookies, so `rabbitmq-2` can never rejoin.

## Diagnosis
    kubectl get pods                                                       # rabbitmq-2 0/1
    kubectl exec rabbitmq-0 -- rabbitmqctl cluster_status                  # rabbitmq-2 not in Running Nodes
    kubectl exec rabbitmq-0 -- cat /var/lib/rabbitmq/.erlang.cookie        # LABCOOKIEKEEPSNODESTOGETHER
    kubectl get secret rabbitmq-secret -o jsonpath='{.data.erlang-cookie}' | base64 -d   # ROTATEDCOOKIE...

## Fix (no restart of 0 and 1)
    kubectl patch secret rabbitmq-secret --type merge -p '{"stringData":{"erlang-cookie":"LABCOOKIEKEEPSNODESTOGETHER"}}'
    kubectl delete pod rabbitmq-2
    kubectl exec rabbitmq-0 -- rabbitmqctl cluster_status        # 3 running nodes
Rotating a cookie properly requires a full-cluster restart (planned downtime or blue/green). Never change the Secret and restart a single node.
