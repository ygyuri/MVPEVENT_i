#!/bin/bash
# Quick SSH to production server

# Check if SSH config exists
if [ -f ~/.ssh/config ] && grep -q "Host event-i-prod" ~/.ssh/config; then
    echo "🔌 Connecting via SSH config..."
    ssh event-i-prod "$@"
else
    echo "🔌 Connecting directly..."
    ssh -i ~/.ssh/github_actions_key brix@34.35.103.163 "$@"
fi
