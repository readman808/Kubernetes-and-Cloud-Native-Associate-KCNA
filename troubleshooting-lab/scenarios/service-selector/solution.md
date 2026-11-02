kubectl -n lab patch svc api --type merge -p '{"spec":{"selector":{"app":"api"},"ports":[{"port":80,"targetPort":80}]}}'
