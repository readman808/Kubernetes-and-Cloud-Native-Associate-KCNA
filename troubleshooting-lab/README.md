# Kubernetes Troubleshooting Lab

A game for teams: a script breaks a real local cluster (kind), you diagnose and fix it with kubectl/helm/vault commands, and `check` tells you if the incident is resolved.

Requires: docker, kind, kubectl (helm for `helm-tls`).

```
./lab.sh list                 # scenarios
./lab.sh start crashloop      # create cluster + incident, prints the brief
./lab.sh hint                 # progressive hints (count them for scoring)
./lab.sh check                # PASS / NOT YET
./lab.sh solution             # spoilers
./lab.sh stop                 # delete cluster
```

Scenarios: crashloop, imagepull, pending, service-selector, vault-secrets, helm-tls.

Team scoring idea: 3 points per scenario, minus 1 per hint used, fastest time breaks ties.
Add a scenario by creating `scenarios/<name>/` with `brief.md` (first line `# Title`), `setup.sh`, `check.sh` (exit 0 when fixed), `hints.txt`, `solution.md`.
