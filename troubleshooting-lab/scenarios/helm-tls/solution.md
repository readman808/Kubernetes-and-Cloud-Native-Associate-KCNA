Option A (create the missing secret):
  openssl req -x509 -nodes -newkey rsa:2048 -keyout /tmp/k -out /tmp/c -subj /CN=gateway -days 1
  kubectl -n lab create secret tls gateway-tls-v2 --cert=/tmp/c --key=/tmp/k
Option B: create gateway-tls and run helm upgrade with --set tls.secretName=gateway-tls
