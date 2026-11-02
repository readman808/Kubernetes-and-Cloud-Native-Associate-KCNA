n=$(kubectl -n lab get endpoints api -o jsonpath='{.subsets[0].addresses[*].ip}' | wc -w)
p=$(kubectl -n lab get endpoints api -o jsonpath='{.subsets[0].ports[0].port}')
[ "$n" -ge 2 ] && [ "$p" = "80" ]
