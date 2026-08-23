<script setup lang="ts">
import Navbar from './components/layout/Navbar.vue'
</script>

<template>
  <div class="app-root min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <!-- NAVBAR -->
    <Navbar />

    <!-- MAIN VIEW ROUTER CONTENT -->
    <main class="flex-grow">
      <router-view />
    </main>

    <!-- TACTICAL FOOTER -->
    <footer class="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="font-mono text-[11px] text-slate-400">CS2 Stratbook v2.0 // Self-Hosted Portainer Build</span>
        </div>
        <div class="flex items-center gap-4 text-[11px]">
          <span>Proxmox LXC Ready</span>
          <span>•</span>
          <span>CS2 Subtick Calibrated</span>
          <span>•</span>
          <span>Offline & Cloud Capable</span>
        </div>
      </div>
    </footer>
  </div>
</template>
