[ "$(kubectl -n lab get deploy checkout -o jsonpath='{.status.readyReplicas}')" = "2" ]
