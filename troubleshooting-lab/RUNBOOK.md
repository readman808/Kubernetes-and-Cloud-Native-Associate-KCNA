# Runbook: Kubernetes Troubleshooting Lab

Audience: team lead (facilitator) and players. Covers setup, running a session, per-scenario solutions, troubleshooting the lab itself, and cleanup.

## 1. Prerequisites (each player)
| Tool | Check | Notes |
|---|---|---|
| Docker | `docker ps` | Must be running. 4 GB RAM free recommended. |
| kind | `kind version` | https://kind.sigs.k8s.io |
| kubectl | `kubectl version --client` | |
| Helm | `helm version` | Only for `helm-tls`. |
| bash | | Mac, Linux, or Windows via WSL. |

Internet is needed on first run to pull images (nginx, busybox, curl, hashicorp/vault, kindest/node).

## 2. Get the lab
```
git clone https://github.com/readman808/Kubernetes-and-Cloud-Native-Associate-KCNA.git
cd Kubernetes-and-Cloud-Native-Associate-KCNA
git checkout ccr-bbc8cff8-5h01sl     # until merged to main
cd troubleshooting-lab
```
Or unzip `troubleshooting-lab.zip`.

## 3. Running a session (facilitator)
1. Pick a scenario: `./lab.sh list`.
2. Each player runs `./lab.sh start <scenario>` on their own machine (creates cluster `kcna-lab`, namespace `lab`).
3. Start the timer. Players investigate with kubectl/helm/vault only.
4. Player runs `./lab.sh check` when they believe it is fixed. PASS ends their run.
5. Hints: `./lab.sh hint` (each use = -1 point). `./lab.sh solution` = scenario forfeited.
6. Scoring: 3 points per solved scenario, -1 per hint, fastest time breaks ties.
7. Debrief: ask what the first command was, what signal pointed to the cause, how to prevent it.

Recommended order: crashloop, imagepull, pending, service-selector, vault-secrets, vault-sealed, helm-tls (easy to hard, about 10-20 min each).

## 4. Scenario answer key
| Scenario | Symptom | Diagnosis commands | Fix |
|---|---|---|---|
| crashloop | CrashLoopBackOff | `kubectl get pods`, `kubectl logs <pod> --previous` ("DB_URL is required") | `kubectl set env deploy/checkout DB_URL=postgres://db:5432/app` |
| imagepull | ErrImagePull | `kubectl describe pod` (Events: tag not found) | `kubectl set image deploy/web nginx=nginx:1.27-alpine` |
| pending | Pending | `kubectl describe pod` (Insufficient cpu/memory) | `kubectl set resources deploy/worker --requests=cpu=100m,memory=64Mi` |
| service-selector | No endpoints | `kubectl get endpoints api`, `kubectl get pods --show-labels`, `kubectl get svc api -o yaml` | Patch selector to `app=api` and targetPort to 80 |
| vault-secrets | App logs "cannot reach" then "no secret" | `kubectl logs deploy/billing`, `kubectl get svc` | `kubectl set env deploy/billing VAULT_ADDR=http://vault:8200`, then `kubectl exec deploy/vault -- env VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=root vault kv put secret/billing api_key=abc123` |
| vault-sealed | Vault sealed; re-seals after unseal | `kubectl get pods` (RESTARTS climbing), `kubectl describe pod` (liveness probe failing on :8201), `vault status` | Patch liveness probe port to 8200; read keys from Secret `vault-init`; `vault operator unseal` twice |
| helm-tls | ContainerCreating | `kubectl describe pod` (secret "gateway-tls-v2" not found), `helm get values gateway -n lab` | Create secret `gateway-tls-v2` (openssl + `kubectl create secret tls`) or `helm upgrade ... --set tls.secretName=<existing>` |

Full commands are in each `scenarios/<name>/solution.md`.

## 5. Generic troubleshooting method (teach this)
1. `kubectl get pods -o wide` : what state?
2. `kubectl describe <resource>` : read Events at the bottom.
3. `kubectl logs <pod> [--previous]` : what does the app say?
4. `kubectl get events --sort-by=.lastTimestamp`
5. Check wiring: labels vs selectors, Service ports, env vars, Secrets/ConfigMaps exist.
6. Change one thing, re-check.

## 6. Troubleshooting the lab itself
| Problem | Fix |
|---|---|
| `Missing required tool` | Install the named tool. |
| Cannot connect to Docker daemon | Start Docker Desktop / `systemctl start docker`. |
| `kind create cluster` hangs or fails | Free disk/RAM; `./lab.sh stop` then retry. |
| Wrong cluster targeted | `kubectl config use-context kind-kcna-lab`. |
| Commands hit the wrong namespace | `kubectl config set-context --current --namespace=lab`. |
| Pods stuck pulling images | Check network/proxy; `docker pull <image>` to test. |
| `check` fails right after fixing | Wait for rollout: `kubectl rollout status deploy/<name>`. |
| Want to restart a scenario | `./lab.sh start <scenario>` again (it recreates namespace `lab`). |
| `helm required` | Install Helm, then restart helm-tls. |

## 7. Cleanup
`./lab.sh stop` deletes the kind cluster and local state. Verify with `kind get clusters`.

## 8. Extending the lab
Create `scenarios/<name>/` with `brief.md` (first line `# Title`), `setup.sh` (apply broken state into namespace `lab`), `check.sh` (exit 0 when fixed), `hints.txt` (one hint per line, gentle to explicit), `solution.md`. Test: start, apply solution, `./lab.sh check` must PASS; before the fix it must fail.

## 9. Known limitations
Scripts were syntax-checked but not yet run against a live cluster. Report issues to the repo owner. Vault runs in dev mode (in-memory, root token `root`): lab use only.
