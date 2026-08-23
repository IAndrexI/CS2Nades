<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : `http://${window.location.hostname}:5000`;

const socket = io(SOCKET_URL);

const status = ref('Connecting...');
const currentView = ref('board');
const activeMap = ref('Mirage');
const strategyName = ref('Default Execute');

// Tactics Board State
const players = ref([
  { id: 'T1', type: 'T', x: 150, y: 200, label: '1' },
  { id: 'T2', type: 'T', x: 150, y: 260, label: '2' },
  { id: 'CT1', type: 'CT', x: 500, y: 200, label: '1' },
  { id: 'CT2', type: 'CT', x: 500, y: 260, label: '2' }
]);

const draggingId = ref(null);
const boardRef = ref(null);

// Lineups Database State
const lineups = ref([]);
const showModal = ref(false); // Fixed: changed from string 'false' to boolean false
const newLineup = ref({ map: 'Mirage', title: '', type: 'Smoke', description: '', author: '' });

// Fetch data on mount
onMounted(async () => {
  socket.on('connect', () => status.value = 'Connected');
  socket.on('disconnect', () => status.value = 'Disconnected');
  socket.on('strat-update', (updatedPlayers) => {
    players.value = updatedPlayers;
  });

  // Fetch Lineups from Backend API
  try {
    const res = await fetch(`${SOCKET_URL}/api/lineups`);
    lineups.value = await res.json();
  } catch (err) {
    console.error('Failed to fetch lineups', err);
  }
});

onUnmounted(() => {
  socket.off('connect');
  socket.off('disconnect');
  socket.off('strat-update');
});

const startDrag = (id) => {
  draggingId.value = id;
};

const onMouseMove = (e) => {
  if (!draggingId.value || !boardRef.value) return;
  const rect = boardRef.value.getBoundingClientRect();
  const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
  const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));

  players.value = players.value.map(p => p.id === draggingId.value ? { ...p, x, y } : p);
  socket.emit('strat-update', players.value);
};

const stopDrag = () => {
  draggingId.value = null;
};

// Save Strategy to Backend
const saveStrategy = async () => {
  try {
    const res = await fetch(`${SOCKET_URL}/api/strategies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: strategyName.value, map: activeMap.value, players: players.value })
    });
    const data = await res.json();
    if (data.success) {
      alert('Strategy successfully saved to server database!');
    }
  } catch (err) {
    alert('Failed to save strategy.');
  }
};

// Add Lineup to Backend
const addLineup = async () => {
  if (!newLineup.value.title || !newLineup.value.description) {
    alert('Please fill out all fields.');
    return;
  }
  try {
    const res = await fetch(`${SOCKET_URL}/api/lineups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLineup.value)
    });
    const data = await res.json();
    if (data.success) {
      lineups.value.push(data.lineup);
      newLineup.value = { map: 'Mirage', title: '', type: 'Smoke', description: '', author: '' };
      showModal.value = false;
    }
  } catch (err) {
    alert('Failed to add lineup.');
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- Header -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
      <div class="flex items-center space-x-6">
        <h1 class="text-xl font-black tracking-wider text-cyan-400 uppercase">CS2 Stratbook</h1>
        <nav class="flex space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            @click="currentView = 'board'" 
            :class="['px-4 py-1.5 rounded-md text-xs font-bold transition-colors', currentView === 'board' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200']"
          >
            Tactics Board
          </button>
          <button 
            @click="currentView = 'lineups'" 
            :class="['px-4 py-1.5 rounded-md text-xs font-bold transition-colors', currentView === 'lineups' ? 'bg-cyan-600 text-slate-950' : 'text-slate-400 hover:text-slate-200']"
          >
            Map Lineups
          </button>
        </nav>
      </div>

      <div class="flex items-center space-x-3">
        <span class="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">Persistent Backend</span>
        <div class="flex items-center space-x-2">
          <span :class="['h-2.5 w-2.5 rounded-full', status === 'Connected' ? 'bg-emerald-500' : 'bg-red-500']"></span>
          <span class="text-xs text-slate-400 font-mono">{{ status }}</span>
        </div>
      </div>
    </header>

    <!-- VIEW 1: TACTICS BOARD -->
    <main v-if="currentView === 'board'" class="flex-1 p-6 flex gap-6 select-none">
      <div 
        ref="boardRef"
        @mousemove="onMouseMove"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        class="flex-1 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden h-[650px] shadow-2xl flex items-center justify-center cursor-crosshair"
      >
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none"></div>
        <div class="absolute uppercase tracking-widest text-slate-700 text-7xl font-black pointer-events-none opacity-20">
          DE_{{ activeMap.toUpperCase() }}
        </div>

        <div
          v-for="player in players"
          :key="player.id"
          @mousedown="startDrag(player.id)"
          :style="{ left: `${player.x}px`, top: `${player.y}px` }"
          :class="[
            'absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-shadow hover:shadow-cyan-500/20',
            player.type === 'T' ? 'bg-amber-600 text-white border-2 border-amber-400' : 'bg-blue-600 text-white border-2 border-blue-400'
          ]"
        >
          {{ player.type }}{{ player.label }}
        </div>

        <div class="absolute bottom-4 left-4 text-xs text-slate-400 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 pointer-events-none">
          💡 Drag tokens to sync across tabs in real-time.
        </div>
      </div>

      <div class="w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 class="font-bold text-slate-200 border-b border-slate-800 pb-3 text-sm uppercase tracking-wider">Strategy Info</h2>
        <div class="text-sm space-y-3 text-slate-400">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Strategy Name:</label>
            <input v-model="strategyName" type="text" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Active Map:</label>
            <select v-model="activeMap" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs">
              <option value="Mirage">Mirage</option>
              <option value="Inferno">Inferno</option>
              <option value="Nuke">Nuke</option>
              <option value="Anubis">Anubis</option>
            </select>
          </div>
        </div>
        <div class="mt-auto">
          <button 
            @click="saveStrategy"
            class="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-cyan-900/20"
          >
            Save Strategy to Server
          </button>
        </div>
      </div>
    </main>

    <!-- VIEW 2: MAP LINEUPS DIRECTORY -->
    <main v-else class="flex-1 p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div class="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-lg font-bold text-slate-200">Grenade Lineups Library</h2>
          <p class="text-xs text-slate-400">Persistent smokes, flashes, and molotov setups saved on the backend server.</p>
        </div>
        <button @click="showModal = true" class="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors">
          + Add New Lineup
        </button>
      </div>

      <!-- Add Lineup Form Modal Drawer -->
      <div v-if="showModal" class="bg-slate-900 border border-slate-800 p-5 rounded-xl mb-6 shadow-2xl flex flex-col gap-4">
        <h3 class="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Submit New Grenade Lineup</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Map</label>
            <select v-model="newLineup.map" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs">
              <option value="Mirage">Mirage</option>
              <option value="Inferno">Inferno</option>
              <option value="Nuke">Nuke</option>
              <option value="Anubis">Anubis</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Title</label>
            <input v-model="newLineup.title" type="text" placeholder="e.g. Window Smoke" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Utility Type</label>
            <select v-model="newLineup.type" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs">
              <option value="Smoke">Smoke</option>
              <option value="Flash">Flash</option>
              <option value="Molotov">Molotov</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs text-slate-400 block mb-1">Description / Lineup Instructions</label>
          <textarea v-model="newLineup.description" rows="2" placeholder="Describe the lineup alignment and throw method..." class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 text-xs"></textarea>
        </div>
        <div class="flex justify-end space-x-3">
          <button @click="showModal = false" class="bg-slate-800 text-slate-300 px-4 py-2 rounded text-xs font-bold">Cancel</button>
          <button @click="addLineup" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 px-4 py-2 rounded text-xs font-bold">Save Lineup</button>
        </div>
      </div>

      <!-- Lineups Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div 
          v-for="item in lineups" 
          :key="item.id" 
          class="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl"
        >
          <div>
            <div class="flex justify-between items-start mb-3">
              <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {{ item.type }}
              </span>
              <span class="text-xs font-mono text-slate-500">{{ item.map }}</span>
            </div>
            <h3 class="font-bold text-slate-100 text-sm mb-2">{{ item.title }}</h3>
            <p class="text-xs text-slate-400 leading-relaxed mb-4">{{ item.description }}</p>
          </div>
          
          <div class="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-500">
            <span>Added by: <strong class="text-slate-300">{{ item.author || 'Anonymous' }}</strong></span>
            <span class="text-emerald-400 font-mono text-[10px]">Synced & Saved</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>