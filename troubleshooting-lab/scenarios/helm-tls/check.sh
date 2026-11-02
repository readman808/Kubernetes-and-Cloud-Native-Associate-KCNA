[ "$(kubectl -n lab get deploy gateway -o jsonpath='{.status.readyReplicas}')" = "1" ]
