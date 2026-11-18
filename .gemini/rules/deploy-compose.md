# Deploy Rule

- Always give the Proxmox LXC update command using Docker Compose only:
  `cd /opt/CS2Nades && git fetch origin main && git reset --hard origin/main && docker compose up -d --build`
- Do not offer systemd/PM2/npm variants unless the user asks.
