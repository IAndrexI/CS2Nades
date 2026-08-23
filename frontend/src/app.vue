<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : `http://${window.location.hostname}:5000`;

const socket = io(SOCKET_URL);

const status = ref('Connecting...');
const players = ref([
  { id: 'T1', type: 'T', x: 150, y: 200, label: '1' },
  { id: 'T2', type: 'T', x: 150, y: 260, label: '2' },
  { id: 'CT1', type: 'CT', x: 500, y: 200, label: '1' },
  { id: 'CT2', type: 'CT', x: 500, y: 260, label: '2' }
]);

const draggingId = ref(null);
const boardRef = ref(null);

onMounted(() => {
  socket.on('connect', () => status.value = 'Connected');
  socket.on('disconnect', () => status.value = 'Disconnected');
  socket.on('strat-update', (updatedPlayers) => {
    players.value = updatedPlayers;
  });
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
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- Header -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-black tracking-wider text-cyan-400 uppercase">CS2 Stratbook</h1>
        <span class="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">Vue 3 Edition</span>
      </div>
      <div class="flex items-center space-x-2">
        <span :class="['h-2.5 w-2.5 rounded-full', status === 'Connected' ? 'bg-emerald-500' : 'bg-red-500']"></span>
        <span class="text-xs text-slate-400 font-mono">{{ status }}</span>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="flex-1 p-6 flex gap-6 select-none">
      <!-- Tactics Board -->
      <div 
        ref="boardRef"
        @mousemove="onMouseMove"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        class="flex-1 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden h-[650px] shadow-2xl flex items-center justify-center cursor-crosshair"
      >
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none"></div>
        <div class="absolute uppercase tracking-widest text-slate-700 text-7xl font-black pointer-events-none opacity-20">
          DE_MIRAGE
        </div>

        <!-- Player Tokens -->
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
          💡 Vue 3 real-time tactical board active! Drag tokens to sync across tabs.
        </div>
      </div>

      <!-- Sidebar -->
      <div class="w-80 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 class="font-bold text-slate-200 border-b border-slate-800 pb-3 text-sm uppercase tracking-wider">Strategy Info</h2>
        <div class="text-sm space-y-2 text-slate-400">
          <p><strong class="text-slate-200">Active Map:</strong> Mirage</p>
          <p><strong class="text-slate-200">Framework:</strong> Vue 3</p>
        </div>
      </div>
    </main>
  </div>
</template>