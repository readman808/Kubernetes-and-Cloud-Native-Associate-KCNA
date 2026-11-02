[ "$(kubectl -n lab get deploy web -o jsonpath='{.status.readyReplicas}')" = "2" ]
