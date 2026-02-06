#!/bin/bash

# Quick SSH connection to Event-i production server
# Usage: ./ssh-event-i-prod.sh [command]
# 
# Examples:
#   ./ssh-event-i-prod.sh                    # Interactive SSH session
#   ./ssh-event-i-prod.sh "docker ps"        # Run command remotely
#   ./ssh-event-i-prod.sh "cd /root/MVPEVENT_i && docker compose ps"

SSH_ALIAS="event-i-prod"

# Check if SSH alias exists
if ! grep -q "^Host $SSH_ALIAS" ~/.ssh/config 2>/dev/null; then
    echo "❌ SSH alias '$SSH_ALIAS' not found in ~/.ssh/config"
    echo ""
    echo "Run the setup script first:"
    echo "  ./setup-ssh-prod.sh"
    echo ""
    echo "Or manually add to ~/.ssh/config:"
    echo "  Host event-i-prod"
    echo "    HostName your-server-ip"
    echo "    User root"
    echo "    IdentityFile ~/.ssh/your-key"
    echo "    Port 22"
    exit 1
fi

# If command provided, execute it; otherwise start interactive session
if [ -n "$1" ]; then
    ssh "$SSH_ALIAS" "$@"
else
    ssh "$SSH_ALIAS"
fi




