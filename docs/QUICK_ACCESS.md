# Quick Access to Production Server

## Method 1: SSH Config (Easiest)
```bash
ssh event-i-prod
```

## Method 2: Direct SSH
```bash
ssh -i ~/.ssh/github_actions_key brix@34.35.103.163
```

## Method 3: GCloud (Recommended)
```bash
gcloud compute ssh event-i-prod --zone=africa-south1-b --project=event-i-475118
```

## Quick Commands

### Check container status:
```bash
ssh event-i-prod "cd /root/MVPEVENT_i && sudo docker compose -f docker-compose.prod.yml ps"
```

### View server logs:
```bash
ssh event-i-prod "cd /root/MVPEVENT_i && sudo docker compose -f docker-compose.prod.yml logs --tail=50 server"
```

### Restart containers:
```bash
ssh event-i-prod "cd /root/MVPEVENT_i && sudo docker compose -f docker-compose.prod.yml restart"
```

### Check disk usage:
```bash
ssh event-i-prod "df -h"
```

## Server Details
- **Hostname**: event-i-prod
- **IP**: 34.35.103.163
- **Zone**: africa-south1-b
- **Project**: event-i-475118
- **User**: brix
- **SSH Key**: ~/.ssh/github_actions_key

## GCloud Setup (if needed)
```bash
gcloud config set account gideonyuri15@gmail.com
gcloud config set project event-i-475118
gcloud auth login gideonyuri15@gmail.com
```
