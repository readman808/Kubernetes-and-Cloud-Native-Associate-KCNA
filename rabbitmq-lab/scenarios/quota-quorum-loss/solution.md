## Root cause
A ResourceQuota `lab-quota` limits the namespace to `pods: 1`. Existing pods are not evicted by a quota, so the cluster ran fine until two pods were deleted - then the StatefulSet controller was refused every time it tried to recreate them. With 1 of 3 members, the quorum queue `payments` has no majority (needs 2) and is unavailable.

## Diagnosis
    kubectl get pods                         # only rabbitmq-0
    kubectl describe sts rabbitmq            # FailedCreate ... exceeded quota: lab-quota
    kubectl describe resourcequota lab-quota # pods 1/1
    kubectl exec rabbitmq-0 -- rabbitmqctl cluster_status
    kubectl exec rabbitmq-0 -- rabbitmqctl list_queues name type members online leader

## Fix
    kubectl patch resourcequota lab-quota --type merge -p '{"spec":{"hard":{"pods":"10"}}}'   # or: kubectl delete resourcequota lab-quota
    kubectl get pods -w                      # wait for rabbitmq-1 and -2 (retry back-off can take a minute or two)
    kubectl exec rabbitmq-0 -- rabbitmqctl cluster_status
Why it recovers without data loss: the PVCs (and Mnesia/Raft data) still exist, so returning nodes rejoin with their old identity and the quorum queue elects/regains a leader. Never `rabbitmqctl forget_cluster_node` or reset a node that is only temporarily gone.
