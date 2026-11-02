# Producer crash-loops with ACCESS_REFUSED on a new vhost
**Severity: SEV-3 | Difficulty: easy**

The orders team moved their producer to a dedicated virtual host called `prod` and gave it its own user, `orders-svc`. The Deployment `producer` now sits in `CrashLoopBackOff`. The team insists "the password is correct, we tested it in the UI".

Your job: work out why RabbitMQ refuses the connection and fix it on the **RabbitMQ side** (do not change the app's credentials), so the producer starts publishing.
