# SSH Connection Troubleshooting for Production

## Current Issue

Connection to `34.35.17.62:22` is timing out.

## Quick Checks

### 1. Verify Server is Running

The server might be stopped or the IP might have changed.

### 2. Check if IP Changed

GCP VMs can get new external IPs if:

- VM was stopped and restarted
- IP was ephemeral (not static)
- VM was recreated

### 3. Try Alternative Connection Methods

#### Option A: Use gcloud SSH (if GCP VM)

```bash
# Find the VM name first
gcloud compute instances list

# Then SSH using gcloud
gcloud compute ssh VM_NAME --zone=ZONE
```

#### Option B: Check Current IP

If you have access to the GCP console or another way to check:

```bash
# List all VMs and their IPs
gcloud compute instances list --format="table(name,zone,status,EXTERNAL_IP)"
```

#### Option C: Try Different Port

Some servers use non-standard SSH ports:

```bash
# Test common alternative ports
nc -zv 34.35.17.62 2222
nc -zv 34.35.17.62 22022
```

### 4. Check Firewall Rules

The server might be blocking your IP:

```bash
# Check GCP firewall rules
gcloud compute firewall-rules list --filter="allowed.ports:22"
```

### 5. Verify SSH Config

Your current config:

```
Host event-i-prod
    HostName 34.35.17.62
    User jeffomondi_eng
    IdentityFile /Users/jeffomondi/.ssh/event-i-vm-key
```

## Solutions

### Solution 1: Update IP if Changed

If the VM got a new IP, update your SSH config:

```bash
# Edit ~/.ssh/config
nano ~/.ssh/config
# Update the HostName to the new IP
```

### Solution 2: Use gcloud SSH

If this is a GCP VM, use gcloud's built-in SSH:

```bash
gcloud compute ssh jeffomondi_eng@VM_NAME --zone=ZONE
```

### Solution 3: Check VM Status

The VM might be stopped:

- Check GCP Console
- Or use: `gcloud compute instances describe VM_NAME --zone=ZONE`

### Solution 4: Request Static IP

To prevent IP changes:

```bash
# Reserve a static IP
gcloud compute addresses create event-i-prod-ip --region=REGION

# Assign it to the VM
gcloud compute instances add-access-config VM_NAME \
    --access-config-name="External NAT" \
    --address=STATIC_IP
```

## Next Steps

1. **Check if you have access to GCP Console** to verify VM status
2. **Try using gcloud SSH** instead of direct SSH
3. **Contact server administrator** if you don't have GCP access
4. **Check if there's a VPN or bastion host** required for access



