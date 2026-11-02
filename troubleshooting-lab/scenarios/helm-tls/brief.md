# Helm release stuck: TLS secret not found
Release `gateway` (chart in `troubleshooting-lab/scenarios/helm-tls/chart`) was installed into
namespace `lab`. Its pod is stuck in ContainerCreating because it mounts a TLS secret.
Goal: pod Running. Fix it through Helm and/or by creating the missing secret.
