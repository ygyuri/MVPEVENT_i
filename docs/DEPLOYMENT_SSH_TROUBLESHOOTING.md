# Deployment SSH Connection Troubleshooting

## Problem: "dial tcp ***:22: i/o timeout"

This error means the GitHub Actions runner cannot connect to your deployment server via SSH.

## Updated Fixes Applied

✅ **Timeout increased from 30s to 120s** - Gives more time for slow network connections
✅ **Debug mode enabled** - Shows detailed connection logs
✅ **Configurable SSH port** - Can use `VM_SSH_PORT` secret if not using port 22

## Quick Diagnostic Steps

### 1. Check Server Status
```bash
# From your local machine
ping your-server-ip
ssh your-username@your-server-ip
```

### 2. Verify SSH Port is Open
```bash
# Test from GitHub Actions context or your machine
nc -zv your-server-ip 22
# OR
telnet your-server-ip 22
```

### 3. Check Server Firewall
```bash
# SSH into your server
sudo ufw status
sudo ufw allow 22/tcp
```

### 4. Verify GitHub Secrets
Go to: **Settings → Secrets and variables → Actions**

Required secrets:
- `VM_HOST` - Server IP or hostname
- `VM_USER` - SSH username  
- `VM_SSH_KEY` - Private SSH key
- `VM_SSH_PORT` - SSH port (optional, defaults to 22)

### 5. Check SSH Service on Server
```bash
# On your server
sudo systemctl status ssh
# OR
sudo systemctl status sshd

# If not running:
sudo systemctl start ssh
sudo systemctl enable ssh
```

## Common Causes & Solutions

### Cause 1: Server is Down/Restarting
**Solution:** Wait a few minutes and retry deployment

### Cause 2: Firewall Blocking Port 22
**Solution:**
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp
sudo ufw reload

# Or open specific IP (safer)
sudo ufw allow from YOUR_GITHUB_IP to any port 22
```

### Cause 3: SSH Service Not Running
**Solution:**
```bash
sudo systemctl start ssh
sudo systemctl enable ssh
```

### Cause 4: Wrong SSH Key in GitHub Secrets
**Solution:**
1. Generate new SSH key: `ssh-keygen -t ed25519 -C "github-actions"`
2. Add public key to server: `cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys`
3. Update `VM_SSH_KEY` secret with private key

### Cause 5: Cloud Provider Firewall Rules
**Check security groups/firewalls:**
- **GCP:** VPC Network Firewall Rules
- **AWS:** Security Groups (Inbound rules for port 22)
- **Azure:** Network Security Groups
- **DigitalOcean:** Cloud Firewalls

### Cause 6: Rate Limiting/DDoS Protection
Some providers rate-limit SSH connections. Wait 10-15 minutes and retry.

## Testing SSH Connection from GitHub Actions

Add this diagnostic step to your workflow:

```yaml
- name: Test SSH Connection
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VM_HOST }}
    username: ${{ secrets.VM_USER }}
    key: ${{ secrets.VM_SSH_KEY }}
    port: ${{ secrets.VM_SSH_PORT || 22 }}
    timeout: 120s
    debug: true
    script: |
      echo "✅ SSH connection successful!"
      echo "Server: $(hostname)"
      echo "Uptime: $(uptime)"
```

## Alternative: Use Different Port

If port 22 is blocked, use a different port:

1. **Update SSH config on server** (`/etc/ssh/sshd_config`):
```bash
Port 2222  # Or any other port
```

2. **Add to GitHub Secret:** `VM_SSH_PORT` = `2222`

3. **Update firewall:**
```bash
sudo ufw allow 2222/tcp
```

## Manual Workaround

If automated deployment fails, deploy manually:

```bash
# From your local machine
scp -i ~/.ssh/your-key .env.production user@server:/tmp/.env.production
ssh -i ~/.ssh/your-key user@server

# On server
cd /root/MVPEVENT_i
mv /tmp/.env.production .env
git pull origin main
docker compose down
docker compose up -d --build
```

## Current Deployment Status

Your code changes are committed and include:
- ✅ SMTP fixes (SSL/TLS port handling)
- ✅ Security headers for emails
- ✅ Firewall auto-fix for SMTP ports
- ✅ Test email recipients updated

Once the SSH connection works, the deployment will apply all these fixes automatically.

