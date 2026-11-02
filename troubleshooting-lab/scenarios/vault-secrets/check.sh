kubectl -n lab logs deploy/billing --tail=3 2>/dev/null | grep -q "GOT SECRET"
