# RabbitMQ Troubleshooting Lab

A game for teams: a script builds a real **3-replica RabbitMQ cluster** on a local kind cluster, breaks it in a realistic way, and prints an incident brief. You diagnose and fix it with `kubectl` and RabbitMQ CLI commands (`rabbitmqctl`, `rabbitmq-diagnostics`). `./lab.sh check` tells you when the incident is resolved.

Requires: docker, kind, kubectl, bash (Mac, Linux, or Windows via WSL). About 4 GB free RAM.

```
./lab.sh list                 # scenarios
./lab.sh start <scenario>     # build cluster + incident, prints the brief
./lab.sh status               # pods / services at a glance
./lab.sh hint                 # progressive hints (each one costs a point)
./lab.sh check                # PASS / NOT YET (shows what is still wrong)
./lab.sh solution             # spoilers
./lab.sh stop                 # delete the kind cluster
```

| Scenario | Difficulty | Skills exercised |
|---|---|---|
| `service-no-endpoints` | easy | Service selectors, ports, endpoints |
| `vhost-permissions` | easy | vhosts, users, permissions, app logs |
| `queue-backlog` | medium | queues, consumers, credentials, crash-loops |
| `memory-alarm` | medium | alarms, blocked connections, ConfigMap changes need a restart |
| `quota-quorum-loss` | hard | ResourceQuota, StatefulSet events, quorum queues, clustering |
| `erlang-cookie` | hard | Erlang cookie, Secrets, cluster membership, safe recovery |

Cluster layout: StatefulSet `rabbitmq` (pods `rabbitmq-0/1/2`, container `rabbitmq`), headless Service `rabbitmq-headless`, client Service `rabbitmq` (5672 AMQP, 15672 management), Kubernetes peer discovery, PVC per pod. Management login: `admin` / `labpass123`.

**See [RUNBOOK.md](RUNBOOK.md)** for the facilitator guide, answer key, command cheat sheets, and a real-world RabbitMQ-on-Kubernetes incident playbook.

Scoring idea: 3 points per scenario, minus 1 per hint, fastest time breaks ties (`check` prints elapsed time).
Add a scenario: `scenarios/<name>/` with `brief.md` (first line `# Title`), `setup.sh`, `check.sh` (exit 0 when fixed), `hints.txt`, `solution.md`. Shared helpers: `base/lib.sh`; healthy cluster: `base/up.sh`.
