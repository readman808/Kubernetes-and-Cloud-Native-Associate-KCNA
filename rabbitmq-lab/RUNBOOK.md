# Runbook: RabbitMQ Troubleshooting Lab (and RabbitMQ on Kubernetes)

Part A is for the facilitator and players running the game. Part B is a real-world incident playbook that each scenario is modelled on, so the lab doubles as training for the on-call rotation.

---
# Part A: Running the lab

## A1. Prerequisites (each player)
| Tool | Check | Notes |
|---|---|---|
| Docker | `docker ps` | Must be running; 4 GB RAM free recommended (3 RabbitMQ nodes + kind). |
| kind | `kind version` | https://kind.sigs.k8s.io |
| kubectl | `kubectl version --client` | |
| bash | | Mac, Linux, or Windows via WSL. |

Internet is needed on first run to pull `kindest/node`, `rabbitmq:3.13-management`, `pivotalrabbitmq/perf-test`, `curlimages/curl`, `busybox`. Pre-pull before a workshop, as the first start takes a few minutes.

## A2. Get the lab
```
git clone https://github.com/readman808/Kubernetes-and-Cloud-Native-Associate-KCNA.git
cd Kubernetes-and-Cloud-Native-Associate-KCNA
git checkout ccr-f5e73947-98zk6e     # until merged to main
cd rabbitmq-lab
```

## A3. Session flow (facilitator)
1. `./lab.sh list`, pick a scenario. Suggested order: service-no-endpoints, vhost-permissions, queue-backlog, memory-alarm, quota-quorum-loss, erlang-cookie (about 10-25 min each).
2. Each player runs `./lab.sh start <scenario>` on their own machine (cluster `rabbitmq-lab`, namespace `lab`). The brief is printed: that is the page.
3. Start the timer. Players use only `kubectl` and commands run inside the pods (`kubectl exec rabbitmq-0 -- rabbitmqctl ...`).
4. `./lab.sh check` when they believe it is fixed. It reports what is still wrong. PASS prints elapsed time and hints used.
5. Hints: `./lab.sh hint` (-1 point each, four per scenario, from gentle to explicit). `./lab.sh solution` forfeits the scenario.
6. Scoring: 3 points per solved scenario, -1 per hint, fastest time breaks ties.
7. Debrief (5 min): What was the first command? Which signal pointed at the cause? How would we detect this in production before users did? What alert or guardrail would prevent it?

Every start tears down namespace `lab` and rebuilds, so scenarios can be replayed. The first `start` of a session creates the kind cluster; `./lab.sh stop` deletes it.

## A4. Answer key
| Scenario | What the player sees | Root cause | Fix |
|---|---|---|---|
| service-no-endpoints | orders-app: `amqp connect FAILED`; `kubectl get endpoints rabbitmq` is `<none>` | Service selector `app: rabbit-mq`; management targetPort 15673 | Patch selector to `app=rabbitmq`, targetPort to 15672 |
| vhost-permissions | producer CrashLoopBackOff; log `NOT_ALLOWED - access to vhost 'prod' refused for user 'orders-svc'` | User has permissions on `/` only | `rabbitmqctl set_permissions -p prod orders-svc ".*" ".*" ".*"` + restart producer |
| queue-backlog | `orders` queue: messages rising, 0 consumers; consumer log `ACCESS_REFUSED` | Consumer password typo (`AppPass` vs `AppPass1`) | `kubectl set env deploy/consumer RMQ_PASS=AppPass1` |
| memory-alarm | `rabbitmq-diagnostics alarms` on all nodes; connections `blocked` | `vm_memory_high_watermark.absolute = 20MB` in ConfigMap | Runtime `set_vm_memory_high_watermark 0.4` x3, durable: fix ConfigMap + `rollout restart sts/rabbitmq` |
| quota-quorum-loss | Only rabbitmq-0 exists; sts event `exceeded quota: lab-quota`; quorum queue `payments` has no majority | ResourceQuota `pods: 1` blocks pod re-creation | Raise/delete quota; pods rejoin from existing PVCs; do not delete PVCs |
| erlang-cookie | rabbitmq-2 never Ready; cluster_status shows it down | Secret cookie changed; only the new pod picked it up | Restore the old cookie in the Secret, `kubectl delete pod rabbitmq-2`; do not restart 0/1 |

Full step-by-step commands are in each `scenarios/<name>/solution.md`.

## A5. Generic troubleshooting method (teach this)
1. **Kubernetes layer first**: `kubectl get pods -o wide`, `kubectl describe pod/sts/svc`, `kubectl get events --sort-by=.lastTimestamp`. Is anything Pending, restarting, not Ready, or missing?
2. **Wiring**: Service selectors vs pod labels, `kubectl get endpoints`, ports, Secrets/ConfigMaps, RBAC, quotas.
3. **Logs**: `kubectl logs <pod> [--previous]` for both RabbitMQ and the client apps. Brokers explain refusals (`ACCESS_REFUSED`, `NOT_ALLOWED`) precisely.
4. **Broker layer**: cluster membership, alarms, queues, connections, permissions (cheat sheet below).
5. Change one thing, re-check, and write down what you changed.
6. Prefer fixes that survive a restart (ConfigMap/Secret/manifest) over runtime-only changes, or at least say which one you used.

## A6. Command cheat sheet
Shorthand: `R="kubectl exec rabbitmq-0 -c rabbitmq --"` then `$R <command>`.

**Kubernetes**
| Goal | Command |
|---|---|
| Pods, nodes, IPs | `kubectl get pods -o wide` |
| Why is it not starting | `kubectl describe pod rabbitmq-1` |
| Controller problems | `kubectl describe sts rabbitmq`, `kubectl get events --sort-by=.lastTimestamp` |
| Logs (current / crashed) | `kubectl logs rabbitmq-1`, `kubectl logs rabbitmq-1 --previous` |
| Who backs a Service | `kubectl get endpoints rabbitmq`, `kubectl get svc rabbitmq -o yaml` |
| Labels | `kubectl get pods --show-labels` |
| Quotas | `kubectl get resourcequota`, `kubectl describe resourcequota` |
| Env of a workload | `kubectl get deploy consumer -o jsonpath='{.spec.template.spec.containers[0].env}'` |
| Edit then roll | `kubectl set env ...`, `kubectl rollout restart sts/rabbitmq`, `kubectl rollout status sts/rabbitmq` |
| Decode a Secret | `kubectl get secret rabbitmq-secret -o jsonpath='{.data.password}' \| base64 -d` |
| Management UI | `kubectl port-forward svc/rabbitmq 15672` then http://localhost:15672 (admin / labpass123) |

**RabbitMQ (inside a pod)**
| Goal | Command |
|---|---|
| Is the node alive | `rabbitmq-diagnostics ping`, `rabbitmq-diagnostics status` |
| Cluster membership | `rabbitmqctl cluster_status` |
| Alarms (memory / disk) | `rabbitmq-diagnostics alarms`, `rabbitmq-diagnostics check_local_alarms` |
| Memory breakdown | `rabbitmq-diagnostics memory_breakdown` |
| Queues | `rabbitmqctl list_queues name type messages consumers`; quorum: `... name type members online leader` |
| Connections / channels | `rabbitmqctl list_connections name user vhost state`, `rabbitmqctl list_channels` |
| Users and vhosts | `rabbitmqctl list_users`, `rabbitmqctl list_vhosts` |
| Permissions | `rabbitmqctl list_permissions -p <vhost>`, `rabbitmqctl list_user_permissions <user>` |
| Grant permission | `rabbitmqctl set_permissions -p <vhost> <user> ".*" ".*" ".*"` |
| Change a password | `rabbitmqctl change_password <user> <new>` |
| Runtime watermark | `rabbitmqctl set_vm_memory_high_watermark 0.4` (lost on restart) |
| Quorum risk before maintenance | `rabbitmq-queues check_if_node_is_quorum_critical` |
| Effective config | `rabbitmqctl environment`, `rabbitmqctl eval 'application:get_all_env(rabbit).'` |
| Cookie in use | `cat /var/lib/rabbitmq/.erlang.cookie` |

## A7. Troubleshooting the lab itself
| Problem | Fix |
|---|---|
| `Missing required tool` | Install the named tool. |
| Cannot connect to Docker daemon | Start Docker Desktop / `systemctl start docker`. |
| `start` seems stuck on "Starting 3-node RabbitMQ cluster" | First run pulls images; watch `kubectl get pods -w` in another terminal. If pods are `Pending`, check Docker has at least 4 GB RAM. |
| PVC `Pending` | kind needs its default `standard` StorageClass: `kubectl get sc`. Recreate the cluster: `./lab.sh stop && ./lab.sh start <s>`. |
| `kubectl exec` says container not found | Add `-c rabbitmq` (pods have one container, but the name must match if you pass it). |
| Wrong cluster / namespace | `kubectl config use-context kind-rabbitmq-lab`; `kubectl config set-context --current --namespace=lab`. |
| `check` fails right after the fix | Pods may still be rolling: `kubectl rollout status sts/rabbitmq`; restarted pods take about 30-60 s to be Ready. Crash-looping apps back off up to 5 min: `kubectl rollout restart deploy/<name>`. |
| Want to restart a scenario | `./lab.sh start <scenario>` again. |
| Port 15672 busy on port-forward | Use `kubectl port-forward svc/rabbitmq 15673:15672`. |

## A8. Cleanup
`./lab.sh stop` deletes the kind cluster and local state; verify with `kind get clusters`.

## A9. Extending the lab
Create `scenarios/<name>/`: `brief.md` (first line `# Title`), `setup.sh` (source `base/lib.sh`, run `base/up.sh`, then break something), `check.sh` (exit 0 when fixed, use `fail "reason"` otherwise), `hints.txt` (one hint per line, gentle to explicit), `solution.md`. Validate: start, confirm `check` FAILS, apply the solution, confirm `check` PASSES. Ideas not yet built: peer-discovery RBAC removed, disk alarm (`disk_free_limit`), network partition with `pause_minority`, dead-letter loop, connection/channel leak, TLS listener misconfig.

## A10. Known limitations
The scripts were syntax-checked and the generated manifests validated, but **have not yet been run against a live cluster** (the authoring environment had no Docker). Do one dry run of every scenario before the team session (A9 validation steps) and fix any image-tag or timing assumptions. Expected tweaks: PerfTest flags/image tag (`pivotalrabbitmq/perf-test:latest` is unpinned), sleeps in `setup.sh`, and rollout timeouts on slow machines. Credentials here (`admin/labpass123`, cookie in a plain Secret) are for lab use only.

---
# Part B: Real-world playbook, RabbitMQ on Kubernetes

Facts to know about this deployment (and most StatefulSet-based RabbitMQ setups): nodes are `rabbit@<pod>.rabbitmq-headless.<ns>.svc.cluster.local`; peers find each other via the Kubernetes API (needs RBAC `get endpoints`); each node keeps data on its PVC; the Erlang cookie is read at node start; `podManagementPolicy: Parallel` lets all nodes start together; `cluster_partition_handling = pause_minority` favours consistency.

## B1. Clients cannot connect (no endpoints / wrong ports)
- **Symptoms**: `connection refused` / timeouts to `rabbitmq:5672`; UI unreachable.
- **Check**: `kubectl get endpoints rabbitmq`; compare `spec.selector` with pod labels; compare target ports with container ports; are pods Ready (readiness gates endpoints)?
- **Fix**: correct selector/targetPort. **Prevent**: manage Services in the same chart as the StatefulSet; add a synthetic AMQP connect check.

## B2. Access refused (authentication vs authorization)
- **Symptoms**: `ACCESS_REFUSED - Login was refused` (bad user/password) vs `NOT_ALLOWED - access to vhost ... refused` or `ACCESS_REFUSED - access to queue/exchange ... refused` (authorization).
- **Check**: client logs; `rabbitmqctl list_users`, `list_vhosts`, `list_user_permissions <user>`; verify the exact vhost in the URI.
- **Fix**: `set_permissions` per vhost with least-privilege regexes; fix credentials in a Secret and roll the app. **Prevent**: provision users/vhosts declaratively (definitions import, Messaging Topology Operator).

## B3. Queue growing, no consumers
- **Symptoms**: `messages_ready` climbing, `consumers = 0`, rising memory, eventually alarms.
- **Check**: `rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers`; consumer pod status and logs (auth, DNS, crash-loops); unacked high with few consumers means slow/stuck handlers or too large prefetch.
- **Fix**: restore consumers; scale consumers; as a last resort `rabbitmqctl purge_queue <q>` (data loss, needs approval). **Prevent**: alert on `consumers == 0` and on queue depth/age; set `max-length`/`message-ttl`/dead-lettering.

## B4. Memory or disk alarm (publishers blocked)
- **Symptoms**: connections `blocked`/`blocking`; UI red alarm badge; publishers hang while consumers still work.
- **Check**: `rabbitmq-diagnostics alarms`, `memory_breakdown`, `rabbitmqctl list_connections name state`; watermark config; pod memory vs limit (`kubectl top pod`), PVC usage.
- **Fix**: drain the backlog or add consumers (alarm clears itself when usage drops); correct watermark/`disk_free_limit`; raise the pod memory limit and PVC if genuinely undersized. Runtime `set_vm_memory_high_watermark` is temporary; make the durable change in ConfigMap and `kubectl rollout restart sts/rabbitmq` (ConfigMaps are not hot-reloaded). Keep the watermark well below the container limit (default 0.4) so the kernel does not OOM-kill the pod.
- **Prevent**: alerts at 70-80% of the watermark and on free disk; per-queue limits.

## B5. Pod will not (re)create (quota, scheduling, storage)
- **Symptoms**: StatefulSet shows fewer pods than desired; no pod to describe.
- **Check**: `kubectl describe sts`, `kubectl get events --sort-by=.lastTimestamp`; `kubectl get resourcequota,limitrange`; Pending pods: `describe pod` (Insufficient cpu/memory, unbound PVC, taints, affinity).
- **Fix**: remove the blocker. **Never delete PVCs** to "unstick" a pod, and never `forget_cluster_node` for a node that will come back. **Prevent**: quota headroom of at least one extra pod for rollouts; PodDisruptionBudget (`maxUnavailable: 1`); alert on `readyReplicas < replicas`.

## B6. Lost quorum (quorum queues / majority)
- **Rule**: a quorum queue or a 3-node cluster with `pause_minority` needs 2 of 3 nodes. With 1 of 3, quorum queues are unavailable and the lone node may pause.
- **Check**: `rabbitmqctl cluster_status`, `list_queues name type members online leader`; `rabbitmq-queues check_if_node_is_quorum_critical` **before** any voluntary restart.
- **Fix**: bring the missing nodes back with their data. Only if a node is gone for good: `rabbitmqctl forget_cluster_node`, then add a replacement and `rabbitmq-queues grow`. **Prevent**: one node at a time during maintenance; wait for Ready and cluster resync between nodes; PDB; spread pods across nodes/zones with anti-affinity.

## B7. Node cannot join (Erlang cookie, DNS, ports)
- **Symptoms**: pod not Ready; `Authentication failed (rejected by the remote node), please check the Erlang cookie`; `nodedown`; table-wait timeouts in logs.
- **Check**: compare `cat /var/lib/rabbitmq/.erlang.cookie` across pods and against the Secret; `nslookup rabbitmq-0.rabbitmq-headless`; ports 4369 (epmd) and 25672 (distribution) reachable; peer-discovery RBAC (`kubectl auth can-i get endpoints --as=system:serviceaccount:<ns>:rabbitmq`); hostname suffix env vars.
- **Fix**: make the cookie identical everywhere. Changing a cookie requires a coordinated restart of **all** nodes (downtime window); never change the Secret and bounce a single node.
- **Prevent**: treat the cookie as immutable; protect the Secret; document rotation as a planned outage.

## B8. Network partition
- **Symptoms**: nodes see each other as down; with `pause_minority`, the minority side pauses. After healing, `partition` shows in `cluster_status`.
- **Fix**: restore network connectivity (CNI, NetworkPolicy, node issues); minority nodes resume automatically. With `ignore`/`autoheal` strategies, inspect for diverged data before choosing a side. **Prevent**: keep `pause_minority`; alert on partitions.

## B9. Safe maintenance checklist
1. `kubectl get pods` all Ready; `rabbitmqctl cluster_status` shows 3 running nodes; no alarms.
2. `rabbitmq-queues check_if_node_is_quorum_critical` on the node about to restart.
3. Restart one pod (or `rollout restart`, which goes in reverse ordinal order); wait for Ready and for the node to appear in `cluster_status`.
4. Re-check queues (`online`, `leader`) before touching the next node.
5. Record what changed; keep PVCs intact.

## B10. Escalation
Collect before escalating: `kubectl get pods,sts,svc,endpoints,pvc,events -o wide`, `kubectl logs` of every RabbitMQ pod (and `--previous`), `rabbitmqctl cluster_status`, `rabbitmq-diagnostics alarms`, `rabbitmqctl list_queues name type messages consumers members online`, and a `rabbitmqctl report` output from a healthy node.
