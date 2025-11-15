#!/bin/bash

# Setup SSH access to production server
# This script helps configure SSH access using GitHub Secrets values

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up SSH access to production server${NC}"
echo ""

# Check if ~/.ssh/config exists
SSH_CONFIG="$HOME/.ssh/config"
SSH_DIR="$HOME/.ssh"

# Create .ssh directory if it doesn't exist
if [ ! -d "$SSH_DIR" ]; then
    echo "Creating ~/.ssh directory..."
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
fi

# Check if config exists
if [ ! -f "$SSH_CONFIG" ]; then
    echo "Creating ~/.ssh/config file..."
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
fi

# Check if "event i prod" already exists in config
if grep -q "^Host \"event i prod\"" "$SSH_CONFIG" || grep -q "^Host event i prod" "$SSH_CONFIG"; then
    echo -e "${YELLOW}⚠️  SSH alias 'event i prod' already exists in ~/.ssh/config${NC}"
    echo ""
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing configuration."
        exit 0
    fi
    # Remove existing entry (handle both quoted and unquoted)
    sed -i.bak '/^Host "event i prod"/,/^$/d' "$SSH_CONFIG"
    sed -i.bak '/^Host event i prod/,/^$/d' "$SSH_CONFIG"
fi

echo ""
echo "To complete the setup, you need the following information from GitHub Secrets:"
echo "  - VM_HOST (server IP or hostname)"
echo "  - VM_USER (SSH username)"
echo "  - VM_SSH_KEY (private SSH key)"
echo "  - VM_SSH_PORT (optional, defaults to 22)"
echo ""
echo "You can find these in: GitHub Repo → Settings → Secrets and variables → Actions"
echo ""

# Prompt for connection details
read -p "Enter server hostname/IP (VM_HOST): " VM_HOST
read -p "Enter SSH username (VM_USER) [default: root]: " VM_USER
VM_USER=${VM_USER:-root}
read -p "Enter SSH port (VM_SSH_PORT) [default: 22]: " VM_PORT
VM_PORT=${VM_PORT:-22}

echo ""
echo "For the SSH key, you have two options:"
echo "  1. Use an existing SSH key file path"
echo "  2. Create a new SSH key file from the GitHub Secret"
echo ""
read -p "Enter SSH key file path (or press Enter to create from GitHub Secret): " KEY_PATH

if [ -z "$KEY_PATH" ]; then
    echo ""
    echo "Please paste the private SSH key from GitHub Secret 'VM_SSH_KEY'"
    echo "Press Ctrl+D when done, or type 'END' on a new line:"
    echo ""
    
    KEY_FILE="$SSH_DIR/id_event-i-prod"
    cat > "$KEY_FILE" << 'EOF'
EOF
    
    # Read multi-line input until END or EOF
    while IFS= read -r line; do
        if [ "$line" = "END" ]; then
            break
        fi
        echo "$line" >> "$KEY_FILE"
    done
    
    chmod 600 "$KEY_FILE"
    KEY_PATH="$KEY_FILE"
    echo ""
    echo -e "${GREEN}✅ SSH key saved to $KEY_PATH${NC}"
else
    if [ ! -f "$KEY_PATH" ]; then
        echo -e "${YELLOW}⚠️  Key file not found: $KEY_PATH${NC}"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    # Convert to absolute path
    KEY_PATH=$(cd "$(dirname "$KEY_PATH")" && pwd)/$(basename "$KEY_PATH")
fi

# Add to SSH config
echo "" >> "$SSH_CONFIG"
echo "# Event-i Production Server" >> "$SSH_CONFIG"
echo "Host event-i-prod" >> "$SSH_CONFIG"
echo "  HostName $VM_HOST" >> "$SSH_CONFIG"
echo "  User $VM_USER" >> "$SSH_CONFIG"
echo "  IdentityFile $KEY_PATH" >> "$SSH_CONFIG"
echo "  Port $VM_PORT" >> "$SSH_CONFIG"
echo "  ServerAliveInterval 60" >> "$SSH_CONFIG"
echo "  ServerAliveCountMax 3" >> "$SSH_CONFIG"

echo ""
echo -e "${GREEN}✅ SSH configuration added to ~/.ssh/config${NC}"
echo ""
echo "You can now connect using:"
echo -e "${BLUE}  ssh event-i-prod${NC}"
echo ""
echo "Testing connection..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes event-i-prod "echo 'Connection successful!'" 2>/dev/null; then
    echo -e "${GREEN}✅ Connection test successful!${NC}"
else
    echo -e "${YELLOW}⚠️  Connection test failed. Please verify:${NC}"
    echo "  1. Server is accessible: ping $VM_HOST"
    echo "  2. SSH port is open: nc -zv $VM_HOST $VM_PORT"
    echo "  3. SSH key has correct permissions: chmod 600 $KEY_PATH"
    echo "  4. Public key is in server's ~/.ssh/authorized_keys"
fi

