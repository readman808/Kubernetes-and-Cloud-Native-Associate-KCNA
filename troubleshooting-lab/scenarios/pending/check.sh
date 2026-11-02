[ "$(kubectl -n lab get deploy worker -o jsonpath='{.status.readyReplicas}')" = "1" ]
