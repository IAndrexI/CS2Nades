<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import type { MapInfo } from '../../types'

const props = defineProps<{
  mapInfo: MapInfo
  showCallouts?: boolean
}>()

const mapStore = useMapStore()
const mapId = computed(() => props.mapInfo.id)
const hasRadarImage = computed(() => !!props.mapInfo.radarImage && mapStore.radarMode !== 'blueprint')
</script>

<template>
  <g class="vector-map-layer select-none pointer-events-none">
    <!-- BASE BACKGROUND -->
    <rect x="0" y="0" width="1000" height="1000" fill="#090d13" />
    
    <!-- CONCENTRIC RADAR RINGS & CROSSHAIR LINES -->
    <circle cx="500" cy="500" r="480" fill="none" stroke="#182332" stroke-width="1.5" stroke-dasharray="8 8" />
    <circle cx="500" cy="500" r="320" fill="none" stroke="#182332" stroke-width="1" stroke-dasharray="6 6" />
    <circle cx="500" cy="500" r="160" fill="none" stroke="#182332" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="500" y1="20" x2="500" y2="980" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="20" y1="500" x2="980" y2="500" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />

    <!-- LAYER 1: REAL OFFICIAL / CUSTOM HIGH-RES CS2 RADAR IMAGE OVERVIEW -->
    <g v-if="hasRadarImage" class="radar-image-layer">
      <image 
        :href="props.mapInfo.radarImage" 
        x="0" 
        y="0" 
        width="1000" 
        height="1000" 
        preserveAspectRatio="xMidYMid slice" 
        :opacity="mapStore.radarOpacity"
        class="transition-opacity duration-200"
      />
    </g>

    <!-- LAYER 2: FALLBACK BLUEPRINT SCHEMATIC (IF NO IMAGE OR BLUEPRINT MODE SELECTED) -->
    <g v-else-if="mapStore.radarMode === 'blueprint'" class="blueprint-fallback-layer opacity-60">
      <g v-if="mapId === 'mirage'">
        <polygon points="260,940 520,940 500,780 320,780" fill="#141c28" stroke="#253549" stroke-width="2" />
        <polygon points="120,680 280,680 260,460 140,460" fill="#172230" stroke="#2c3e56" stroke-width="2" />
        <polygon points="180,420 380,420 380,240 180,240" fill="#1a2737" stroke="#354c69" stroke-width="2" />
        <polygon points="380,340 480,340 480,200 380,200" fill="#15202e" stroke="#283a52" stroke-width="2" />
        <polygon points="280,460 440,460 440,400 320,400" fill="#172332" stroke="#2a3c53" stroke-width="2" />
        <polygon points="400,740 540,740 520,520 420,520" fill="#192534" stroke="#2e425c" stroke-width="2" />
        <polygon points="530,480 620,480 660,260 560,260" fill="#172332" stroke="#2d405a" stroke-width="2" />
        <polygon points="620,720 740,720 720,440 640,440" fill="#172433" stroke="#2b3d56" stroke-width="2" />
        <polygon points="800,640 940,640 920,460 820,460" fill="#17212e" stroke="#2c3c52" stroke-width="2" />
        <polygon points="660,460 840,460 840,300 660,300" fill="#1a2738" stroke="#354b68" stroke-width="2" />
        <polygon points="540,260 760,260 740,160 560,160" fill="#141c28" stroke="#253549" stroke-width="2" />
      </g>
      <g v-else>
        <rect x="200" y="200" width="600" height="600" rx="30" fill="#141c28" stroke="#253549" stroke-width="2" />
      </g>
    </g>

    <!-- LAYER 3: BOMB SITE A ZONE GLOW & LETTER -->
    <g 
      v-if="mapInfo.sites?.a"
      :transform="`translate(${mapInfo.sites.a.x * 10}, ${mapInfo.sites.a.y * 10})`"
      class="site-marker-a"
    >
      <circle cx="0" cy="0" r="32" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 4" />
      <circle cx="0" cy="0" r="16" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" />
      <text x="0" y="6" font-size="16" font-weight="900" text-anchor="middle" fill="#fee2e2" font-family="monospace">A</text>
    </g>

    <!-- LAYER 4: BOMB SITE B ZONE GLOW & LETTER -->
    <g 
      v-if="mapInfo.sites?.b"
      :transform="`translate(${mapInfo.sites.b.x * 10}, ${mapInfo.sites.b.y * 10})`"
      class="site-marker-b"
    >
      <circle cx="0" cy="0" r="32" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 4" />
      <circle cx="0" cy="0" r="16" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" />
      <text x="0" y="6" font-size="16" font-weight="900" text-anchor="middle" fill="#fee2e2" font-family="monospace">B</text>
    </g>

    <!-- LAYER 5: CALLOUT LABELS (IF ENABLED) -->
    <g v-if="showCallouts" class="callouts-layer opacity-85 transition-opacity duration-200">
      <g 
        v-for="callout in mapInfo.callouts" 
        :key="callout.id" 
        :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10})`"
      >
        <circle cx="0" cy="0" r="2.5" fill="#64748b" />
        <rect 
          :x="-(callout.name.length * 3.5)" 
          y="-18" 
          :width="callout.name.length * 7" 
          height="14" 
          rx="3" 
          fill="#0a0f18" 
          fill-opacity="0.75" 
        />
        <text 
          x="0" 
          y="-8" 
          font-size="10" 
          font-weight="700" 
          text-anchor="middle" 
          fill="#cbd5e1"
          class="tracking-wider uppercase font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        >
          {{ callout.name }}
        </text>
      </g>
    </g>
  </g>
</template>
