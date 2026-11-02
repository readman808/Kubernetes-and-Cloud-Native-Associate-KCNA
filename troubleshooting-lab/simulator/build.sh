#!/usr/bin/env bash
# Builds the single-file simulator: simulator/k8s-troubleshooting-lab.html
cd "$(dirname "$0")"
{ cat head.html; echo '<script>'; cat core.js scenarios.js ui.js; echo '</script></body></html>'; } > k8s-troubleshooting-lab.html
echo "built $(wc -c < k8s-troubleshooting-lab.html) bytes"
