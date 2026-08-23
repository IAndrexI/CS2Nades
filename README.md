# CS2 Stratbook (Vue 3 + Vite) 🎯

A modern, tactical **Counter-Strike 2 Stratbook and Interactive Radar Minimap** built with **Vue 3, TypeScript, Vite, Tailwind CSS, and Pinia**, tailored for self-hosting in a **Proxmox LXC container via Docker / Portainer**.

Inspired by `csgo-stratbook` and rewritten from scratch with instant reactive minimap utility toggles, trajectory visualizations, 5-player team execute planning, and tactical drafting tools.

---

## ⚡ Key Features

- 🗺️ **Interactive Radar Minimap**:
  - Pan & Zoom tactical vector radar maps for all competitive maps (*Mirage, Inferno, Dust II, Nuke, Ancient, Anubis, Vertigo, Train, Cache, Overpass*).
  - **Granular Nade Toggles**: 1-click filters for **Smokes**, **Flashes**, **Molotovs/Incendiaries**, and **HE Grenades** with live count indicators.
  - **Animated Trajectories**: Dynamic curved flight paths connecting throw origin (player standing spot) to grenade landing zone.
  - **Instant Tooltip HUD**: Hover previews for quick in-game reference.

- 📖 **Lineup Inspector & Media Guides**:
  - Detailed crosshair alignment screenshots and embedded video guides (YouTube / Streamable / MP4).
  - Throw techniques: *Standing, Jumpthrow, Runthrow, Crouch Jumpthrow, Left+Right Click, W-Jumpthrow*.
  - CS2 Subtick compatibility verification and 1-click copyable console practice commands (`setpos`, `setang`).

- 👥 **Team Stratbook & Playbook Planner**:
  - Organize complete 5-player executes (IGL, Entry, Support, Lurker, AWP).
  - Multi-phase timeline breakdowns (Spawn Setup -> Utility Dump -> Site Breach -> Post-Plant).
  - Link specific indexed utility lineups to each player in the round.

- 🎯 **Tactics Drawing Board**:
  - Freehand tactical editor: draw movement paths, vision lines, smoke clouds, flash bursts, fire zones, and assign player pins (P1–P5) on the radar.

- 💾 **Offline-Ready & Self-Hosted**:
  - Persists custom lineups and strategies in local browser storage with 1-click **JSON Backup Export & Import**.
  - Ultra-lightweight Docker image (~25MB) using Alpine Nginx.

---

## 🚀 Local Development

### Prerequisites
- Node.js (v18+) & npm

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Open in browser: http://localhost:3000
```

### Production Build
```bash
npm run build
```

---

## 🐳 Self-Hosting in Proxmox LXC + Portainer

### Method 1: Portainer Git Repository Stack (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "Build Vue 3 CS2 Stratbook with Interactive Minimap"
   git push origin main
   ```
2. Open **Portainer** in your Proxmox LXC container.
3. Go to **Stacks** -> **Add stack**.
4. Choose **Repository** build method:
   - **Repository URL**: `https://github.com/YourUsername/CS2Nades`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.yml`
   - (Optional) Enable **Automatic updates / Webhook** so Portainer redeploys whenever you push changes from your desktop!
5. Click **Deploy the stack**.
6. Access your Stratbook at `http://<PROXMOX-LXC-IP>:8080`!

### Method 2: Direct Docker Compose
```bash
docker compose up -d --build
```

---

## 📁 Project Architecture

```
CS2Nades/
├── Dockerfile                  # Multi-stage Alpine Nginx container
├── docker-compose.yml          # Portainer stack configuration
├── nginx.conf                  # Production SPA history routing & gzip
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── types/index.ts          # TypeScript interfaces (Lineups, Strats, Maps)
    ├── data/
    │   ├── mapsData.ts         # Competitive CS2 maps & callout coordinates
    │   ├── defaultLineups.ts   # Pre-indexed utility library
    │   └── defaultStrats.ts    # Pre-built team execute playbooks
    ├── stores/
    │   ├── mapStore.ts         # Minimap radar, zoom, nade filters state
    │   ├── lineupStore.ts      # Lineups state & local storage persistence
    │   └── stratStore.ts       # Team strats & tactics board state
    ├── components/
    │   ├── layout/Navbar.vue   # Tactical CS2 HUD navigation header
    │   ├── map/
    │   │   ├── InteractiveMinimap.vue  # Pan/zoom radar & trajectory engine
    │   │   ├── NadeFilterBar.vue       # Quick toggle buttons & counters
    │   │   └── VectorMapBlueprint.vue  # Vector map blueprints & callouts
    │   ├── lineups/
    │   │   ├── LineupCard.vue
    │   │   ├── LineupGrid.vue
    │   │   ├── LineupModal.vue         # Video/screenshot guide inspector
    │   │   └── AddLineupModal.vue      # Custom lineup creator with radar picker
    │   ├── strats/
    │   │   ├── StratCard.vue
    │   │   └── StratModal.vue          # 5-player execute visualizer
    │   ├── tactics/TacticsBoard.vue    # Interactive tactics board
    │   └── common/
    │       ├── NadeIcon.vue
    │       └── DataSyncModal.vue       # JSON backup export & restore
    └── views/
        ├── MinimapView.vue             # Primary radar utility view
        ├── StratbookView.vue           # Team playbooks view
        ├── TacticsBoardView.vue        # Dedicated tactics board
        └── LibraryView.vue             # Searchable lineup catalog
```

---

## 📄 License
MIT License
