# Protutech | CS2 Tactical Playbook & Live Squad Platform

Personal tactical utility, synchronized executes, and live collaborative whiteboard platform for Counter-Strike 2.

---

## 📑 Table of Contents

- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Directory Structure Breakdown](#-directory-structure-breakdown)
  - [1. Root Configuration](#1-root-configuration)
  - [2. Public Assets (`public/`)](#2-public-assets-public)
  - [3. Backend Server (`server/`)](#3-backend-server-server)
  - [4. Frontend Source (`src/`)](#4-frontend-source-src)
    - [State Stores (`src/stores/`)](#state-stores-srcstores)
    - [Component Hierarchy (`src/components/`)](#component-hierarchy-srccomponents)
    - [Views & Router Pages (`src/views/`)](#views--router-pages-srcviews)
    - [Utilities & Types (`src/utils/` & `src/types/`)](#utilities--types-srcutils--srctypes)
- [How Components Connect & Work Together](#-how-components-connect--work-together)
  - [A. Map Selection & Minimap Coordination](#a-map-selection--minimap-coordination)
  - [B. Live Real-Time Tactics Synchronization](#b-live-real-time-tactics-synchronization)
  - [C. Custom Theming & Accent Engine](#c-custom-theming--accent-engine)
  - [D. End-to-End Encrypted (E2EE) Chat & DMs](#d-end-to-end-encrypted-e2ee-chat--dms)
  - [E. Authentication, Guest Access & Admin Hierarchy](#e-authentication-guest-access--admin-hierarchy)
- [Getting Started](#-getting-started)
- [Docker Deployment](#-docker-deployment)

---

## 🔄 System Architecture & Data Flow

```
                                  ┌──────────────────────────────────────────────┐
                                  │               Client Browser                 │
                                  │                                              │
                                  │   ┌──────────────────────────────────────┐   │
                                  │   │        Vue 3 + Tailwind CSS 4        │   │
                                  │   └──────────────────┬───────────────────┘   │
                                  │                      │                       │
                                  │   ┌──────────────────▼───────────────────┐   │
                                  │   │       Pinia Reactive State Stores    │   │
                                  │   │ (auth, map, lineup, strat, room, ...)│   │
                                  │   └──────────┬───────────────────┬───────┘   │
                                  └──────────────┼───────────────────┼───────────┘
                                                 │ REST API          │ WebSocket
                                                 │ (Axios)           │ (Socket.IO)
                                                 ▼                   ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                       Node.js + Express Backend Server                         │
│                                                                                │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │   Auth & JWT System   │  │   Real-Time Rooms    │  │  Lineup & Strategy  │  │
│  │ (Steam, Email, Guest) │  │  (Tactics Sync, DM)  │  │   Cloud Storage     │  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └──────────┬──────────┘  │
│              │                         │                         │             │
│              └─────────────────────────┼─────────────────────────┘             │
│                                        ▼                                       │
│                       ┌─────────────────────────────────┐                      │
│                       │   JSON Database Storage Engine  │                      │
│                       │        (server/data/db.json)    │                      │
│                       └─────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure Breakdown

```
CS2Nades/
├── public/                          # Static public assets (images, radar files, icons)
│   ├── icons/                       # Tactical grenade PNG icons, C4 bomb, defuse kit
│   ├── map-icons/                   # Map pool icons for map selector sidebar
│   ├── maps/                        # High-resolution map loading screen imagery
│   ├── minimaps/                    # Overview images for cards and previews
│   └── radars/                      # CS2 overhead radars (standard & simpleradar split)
│
├── server/                          # Backend Node.js / Express / Socket.IO server
│   ├── data/                        # Persistent database storage
│   │   └── db.json                  # Accounts, room states, tactics, messages DB
│   └── server.js                    # API routes, WebSockets handlers, Auth logic
│
├── src/                             # Frontend Vue 3 application source code
│   ├── assets/                      # Global frontend style resources
│   ├── components/                  # Modular Vue components
│   │   ├── auth/                    # Authentication modal (Steam, Credentials, Guest)
│   │   ├── common/                  # Reusable widgets (NadeIcon, Dialogs, DataSync)
│   │   ├── layout/                  # Navbar, role switcher, top indicators
│   │   ├── lineups/                 # Lineup cards, grid, details modal, execute creator
│   │   ├── map/                     # Minimap canvas, vector blueprint, filter bar
│   │   ├── strats/                  # Strat cards, multi-phase strategy modal
│   │   ├── tactics/                 # Live collaborative whiteboard canvas & tools
│   │   └── user/                    # Settings modal, E2EE DMs, player roster modal
│   ├── composables/                 # Reusable composition helpers (confirmation modal)
│   ├── config/                      # Site branding, metadata, static constants
│   ├── data/                        # Default seed lineups, strategies, and map configs
│   ├── router/                      # Vue Router route definitions & navigation guards
│   ├── stores/                      # Pinia state stores (Auth, Map, Strat, Room, etc.)
│   ├── types/                       # TypeScript interfaces and type definitions
│   ├── utils/                       # E2EE Crypto, CS2 in-game coordinate transformers
│   ├── views/                       # Top-level page views mounted by router
│   ├── App.vue                      # Root Vue layout, theme injector, global modals
│   ├── main.ts                      # App entry point, Pinia & Router registration
│   └── style.css                    # Tailwind CSS v4 setup, custom scrollbars, animations
│
├── Dockerfile                       # Production container build definition
├── docker-compose.yml               # Multi-container orchestration
├── index.html                       # Single Page Application HTML entrypoint
├── package.json                     # Node.js project manifest & npm scripts
├── tsconfig.json                    # TypeScript compiler configuration
└── vite.config.ts                   # Vite bundler, alias resolution & proxy setup
```

---

### 1. Root Configuration

| File | Purpose |
|---|---|
| `package.json` | Defines project scripts (`dev`, `build`, `server`), frontend dependencies (Vue 3, Pinia, Vue Router, Lucide icons, Socket.IO client, Axios, JSZip) and backend packages (Express, Socket.IO, CORS, JWT, Bcrypt). |
| `vite.config.ts` | Configures Vite bundler, `@tailwindcss/vite` plugin, `@` path aliasing to `/src`, and reverse proxy rules routing `/api` and `/socket.io` directly to the backend server. |
| `tsconfig.json` | Configures TypeScript compiler settings, strict typing, DOM types, and path mapping. |
| `index.html` | The HTML entrypoint that mounts the `#app` container, imports fonts, and sets browser viewport meta settings. |
| `Dockerfile` & `docker-compose.yml` | Containerization files for building and deploying both frontend static assets and the Node.js backend server. |

---

### 2. Public Assets (`public/`)

| Folder / File | Contents & Usage |
|---|---|
| `public/icons/` | CS2 grenade icons (`smoke.png`, `flashbang.png`, `molotov.png`, `grenade.png`, `decoy.png`), realistic C4 explosive pack (`c4.png`), defuse kit, and Steam branding. |
| `public/map-icons/` | Active duty and reserve map pool icons (Dust II, Mirage, Inferno, Nuke, Overpass, Ancient, Anubis, Vertigo, Cache, Train) used in sidebars and selectors. |
| `public/maps/` | Scenic high-resolution CS2 map screenshots used in headers, cards, and modal backdrops. |
| `public/minimaps/` | Overview minimap textures used for thumbnails and tactical previews. |
| `public/radars/` | Official 1024x1024 overhead radar map files and `simpleradar` variants (including split-layer textures for multi-level maps like Nuke and Vertigo). |

---

### 3. Backend Server (`server/`)

| File / Subfolder | Description |
|---|---|
| `server/server.js` | Complete Node.js Express server and Socket.IO server: <br>• **Authentication**: JWT token generation, bcrypt password hashing, Steam profile verification, guest session handling.<br>• **User & Admin Management**: Roles (`Admin`, `Coach`, `Analyst`, `Pro Player`, `Guest`), account bans, online/offline tracking, preview modes.<br>• **Real-Time Tactics Rooms**: Socket.IO events (`room:join`, `room:draw`, `room:undo`, `room:redo`, `room:clear`, `room:switch_map`, `room:chat`) with user ownership tracking and host controls.<br>• **E2EE Direct Messaging**: Encrypted 1-on-1 private messaging and squad group channels.<br>• **Cloud Storage**: Endpoints to save, load, and sync tactical lineups and strategy boards. |
| `server/data/db.json` | Persistent JSON database file storing user profiles, hashed credentials, squad groups, direct messages, and cloud strategies. |

---

### 4. Frontend Source (`src/`)

#### State Stores (`src/stores/`)
All reactive state is managed centrally through Pinia stores:

- **`authStore.ts`**: Handles authentication state, active JWT tokens, Steam/Email login, guest mode restrictions, in-game tactical roles, and Admin preview modes.
- **`themeStore.ts`**: Dynamic UI theme engine allowing custom accent colors (`--app-accent`), custom dark/light background colors, compact mobile preview simulator, and unread notification badge toggles.
- **`mapStore.ts`**: Tracks the currently active map (e.g. Mirage, Inferno), active duty pool filtering, custom callouts, and temporary grenade placement coordinates.
- **`lineupStore.ts`**: Manages all CS2 grenade lineups, local custom lineups, cloud syncing, favorites, search filters, and 5-man synchronized execute packages.
- **`stratStore.ts`**: Manages interactive whiteboard elements (freehand pen strokes, directional arrows, distance lines, grenade stamps, text callout notes, C4 bomb pins), active drawing tool, stroke width, active drawing color, undo/redo history stacks, and local JSON export/import.
- **`gameRoomStore.ts`**: Controls Socket.IO WebSocket client connections, tactical room codes, member rosters, host permissions (`allowGuestsToDraw`, `onlyHostCanChangeMap`), ghost observation mode, and room chat.
- **`adminStore.ts`**: Admin panel operations for inspecting all registered accounts, viewing online/offline statuses, toggling roles, banning users, and server diagnostic metrics.

#### Component Hierarchy (`src/components/`)

- **`auth/`**
  - `AuthModal.vue`: Global authentication dialog supporting Steam profile URL/ID login, standard Email/Password credentials, and 1-click Guest access.
- **`common/`**
  - `NadeIcon.vue`: Dynamic grenade SVG icon component with team side styling and grenade type color codes.
  - `GlobalConfirmModal.vue`: Universal centered confirmation modal for destructive or critical actions (deleting lineups, clearing board, switching maps).
  - `DataSyncModal.vue`: Import, export, and cloud synchronization modal for personal playbook backups.
- **`layout/`**
  - `Navbar.vue`: Top navigation bar containing the active map selector dropdown, page navigation links, live role badges, unread message notifications, user profile dropdown, and guest mode preview banners.
- **`lineups/`**
  - `LineupCard.vue`: Card component displaying thumbnail, grenade badge, throw type, movement type, tickrate, and author.
  - `LineupGrid.vue`: Responsive masonry grid displaying filtered lineups with search and tag support.
  - `LineupModal.vue`: Comprehensive modal showing crosshair alignment screenshot, embedded YouTube/video demo, step-by-step instructions, and 1-click copyable console throw binds.
  - `AddLineupModal.vue`: Modal to add and calibrate new grenade lineups with origin/landing coordinates.
  - `CreateExecuteModal.vue`: Modal to assemble multiple smokes, flashes, and molotovs into a synchronized multi-player site take.
  - `LineupConflictModal.vue`: Conflict resolution modal for merging incoming data with existing saved lineups.
- **`map/`**
  - `InteractiveMinimap.vue`: High-performance interactive radar viewer that plots clickable grenade pins, animated trajectory curves, callout annotations, and player positions.
  - `MapSelectorSidebar.vue`: Left navigation sidebar showing map thumbnails, names, and active duty badges.
  - `MapSettingsModal.vue`: Calibration tool for radar layer selection (Standard vs SimpleRadar) and callout text toggles.
  - `NadeFilterBar.vue`: Tactical filter toolbar for selecting grenade types (Smokes, Flashes, Molotovs, HEs) and team sides (T / CT).
  - `VectorMapBlueprint.vue`: Precision SVG overlay rendering radar boundaries, callout text labels, and measurement grids.
- **`strats/`**
  - `StratCard.vue`: Strategy playbook preview card showing buy type (Full Buy, Eco, Force), side, and phase count.
  - `StratModal.vue`: Multi-phase strategy breakdown assigning roles (IGL, Entry, Support, Lurker, AWPer), utility timings, and positions.
- **`tactics/`**
  - `TacticsBoard.vue`: Live collaborative drawing board featuring pen, arrow tools, distance measurement, player icons, bomb placement, custom stamps, undo/redo stacks, room chat, encrypted DMs, member roster, and cloud save/export.
- **`user/`**
  - `UserSettingsModal.vue`: Full user preferences modal (avatar, tactical role, custom accent color, ZIP backup export, password change, account deletion).
  - `PublicProfileModal.vue`: Public player profile modal showing rank, role, bio, and shared lineups.
  - `PeopleAndGroupsModal.vue`: Community directory listing all online/away players, squad groups, and open tactical rooms.
  - `DirectMessagesModal.vue`: End-to-end encrypted private chat and squad group messaging interface.

#### Views & Router Pages (`src/views/`)

- **`MinimapView.vue` (`/`)**: Main interactive radar view combining map selector sidebar, grenade filters, interactive minimap canvas, and lineup grid.
- **`LibraryView.vue` (`/library`)**: Searchable global library of all indexed CS2 grenade lineups across all maps.
- **`MyLineupsView.vue` (`/my-lineups`)**: Personal playbook showcasing custom user lineups, saved favorites, and private utility.
- **`StratbookView.vue` (`/strats`)**: Tactical strategy library of 5-player executes and map defaults.
- **`TacticsBoardView.vue` (`/tactics`)**: Collaborative live tactics room with full drawing whiteboard and squad chat.
- **`CalloutsView.vue` (`/callouts`)**: Interactive map callout learning and inspection tool.
- **`GameRoomView.vue` (`/room/:id`)**: Direct route for joining tactical squad rooms via invite code.
- **`AdminView.vue` (`/admin`)**: Administrator management dashboard for inspecting all users, viewing connection status, and moderating content.

#### Utilities & Types (`src/utils/` & `src/types/`)

- **`src/types/index.ts`**: Type definitions for `Lineup`, `TacticsElement`, `User`, `GameRoom`, `Strategy`, `MapData`, `DirectMessage`, etc.
- **`src/utils/crypto.ts`**: Web Cryptography API (`SubtleCrypto`) implementation providing AES-GCM 256-bit encryption with SHA-256 derived keys for private messaging.
- **`src/utils/cs2Coords.ts` & `radarCoords.ts`**: Mathematical transformation matrices converting CS2 in-game world coordinates `(X, Y, Z)` to 2D radar percentage coordinates `(0-100%)`.
- **`src/utils/mapColliders.ts`**: Polygon collider data for in-bounds map areas.

---

## 🔗 How Components Connect & Work Together

### A. Map Selection & Minimap Coordination
1. The user clicks a map in `MapSelectorSidebar.vue` or the top `Navbar.vue` dropdown.
2. This mutates `mapStore.currentMapId`, which automatically updates the radar background in `InteractiveMinimap.vue` and loads matching lineups in `lineupStore.currentMapLineups`.
3. Selecting a grenade in `LineupGrid.vue` highlights its throw trajectory and landing point on `InteractiveMinimap.vue`.

### B. Live Real-Time Tactics Synchronization
1. When a user opens `/tactics`, `gameRoomStore.connectSocket()` establishes a WebSocket connection to `server/server.js`.
2. As a user draws on `TacticsBoard.vue`, drawing strokes and tactical pins are added to `stratStore.boardElements` and broadcasted via `room:draw` to all peers in the same room.
3. Undo/redo actions track user ownership, ensuring teammates only modify their own markings unless they are the Room Host.
4. If the host switches maps, a modal presents options to clear the board, export to JSON, or save to cloud, and synchronizes the map switch across all connected viewers.

### C. Custom Theming & Accent Engine
1. In `UserSettingsModal.vue`, selecting a custom color updates `themeStore.customAccentColor`.
2. This injects CSS variables `--app-accent` and `--app-accent-rgb` on `:root`, instantly re-theming primary action buttons, borders, trajectory lines, icons, and highlights across the entire application without page reloads.

### D. End-to-End Encrypted (E2EE) Chat & DMs
1. When User A messages User B in `DirectMessagesModal.vue` or the Tactics sidebar, `crypto.ts` generates a deterministic shared secret from both user IDs using client-side SHA-256 hashing.
2. The payload is encrypted with AES-GCM before being sent over WebSockets or stored in `server/data/db.json`.
3. Only the intended recipient can decrypt and view the plaintext message content.

### E. Authentication, Guest Access & Admin Hierarchy
1. Users can authenticate with Email/Password or Steam Profile sync, or browse as a Guest.
2. Guests have view-only access to live tactics rooms and cannot overwrite server data.
3. Admins can view the live roster of all accounts in `AdminView.vue`, simulate Guest/User preview modes, and enable Ghost Mode to observe tactical rooms silently.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm 9+ installed

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Full Development Environment
Runs Vite frontend dev server (port `5173`) and Node.js backend server (port `3001`):
```bash
npm run dev
```

### 3. Build Production Bundle
```bash
npm run build
```

### 4. Run Standalone Backend Server
```bash
npm run server
```

---

## 🐳 Docker Deployment

To build and run the entire application in a production Docker container:

```bash
docker compose up -d --build
```

The application will be accessible at `http://localhost:3001`.
