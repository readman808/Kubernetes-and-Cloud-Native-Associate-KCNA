# rabbitmq-2 will not rejoin the cluster after a restart
**Severity: SEV-2 | Difficulty: hard**

Someone rotated the shared Erlang cookie (Secret `rabbitmq-secret`) "for security" and then restarted `rabbitmq-2` to test it. The pod never becomes Ready and `rabbitmqctl cluster_status` from the other nodes lists `rabbitmq-2` as down. `rabbitmq-0` and `rabbitmq-1` are still serving traffic, but you are one failure away from losing quorum.

Your job: find out why the node cannot talk to its peers and restore a healthy 3-node cluster **without restarting rabbitmq-0 or rabbitmq-1** (they are serving production traffic).
