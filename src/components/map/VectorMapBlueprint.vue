<script setup lang="ts">
import { computed } from 'vue'
import type { MapInfo } from '../../types'

const props = defineProps<{
  mapInfo: MapInfo
  showCallouts?: boolean
}>()

const mapId = computed(() => props.mapInfo.id)
</script>

<template>
  <g class="vector-map-layer select-none pointer-events-none">
    <!-- BACKGROUND RADAR GRID -->
    <rect x="0" y="0" width="1000" height="1000" fill="#090d13" />
    
    <!-- CONCENTRIC RADAR RINGS & CROSSHAIR LINES -->
    <circle cx="500" cy="500" r="480" fill="none" stroke="#182332" stroke-width="1.5" stroke-dasharray="8 8" />
    <circle cx="500" cy="500" r="320" fill="none" stroke="#182332" stroke-width="1" stroke-dasharray="6 6" />
    <circle cx="500" cy="500" r="160" fill="none" stroke="#182332" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="500" y1="20" x2="500" y2="980" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="20" y1="500" x2="980" y2="500" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />

    <!-- ==================================================== -->
    <!-- MIRAGE VECTOR BLUEPRINT -->
    <!-- ==================================================== -->
    <g v-if="mapId === 'mirage'">
      <!-- Floor Zones -->
      <!-- T Spawn & Back Alley -->
      <polygon points="260,940 520,940 500,780 320,780" fill="#141c28" stroke="#253549" stroke-width="2" />
      <!-- B Apartments -->
      <polygon points="120,680 280,680 260,460 140,460" fill="#172230" stroke="#2c3e56" stroke-width="2" />
      <!-- B Site Floor -->
      <polygon points="180,420 380,420 380,240 180,240" fill="#1a2737" stroke="#354c69" stroke-width="2" />
      <!-- Market / Kitchen -->
      <polygon points="380,340 480,340 480,200 380,200" fill="#15202e" stroke="#283a52" stroke-width="2" />
      <!-- Catwalk / Short B -->
      <polygon points="280,460 440,460 440,400 320,400" fill="#172332" stroke="#2a3c53" stroke-width="2" />
      <!-- Mid / Top Mid -->
      <polygon points="400,740 540,740 520,520 420,520" fill="#192534" stroke="#2e425c" stroke-width="2" />
      <!-- Underpass -->
      <polygon points="440,620 540,620 540,500 480,500" fill="#131b26" stroke="#233246" stroke-width="2" />
      <!-- Snipers Window -->
      <rect x="460" y="340" width="70" height="70" fill="#1f2f42" stroke="#3b5475" stroke-width="2" />
      <!-- Connector & Jungle -->
      <polygon points="530,480 620,480 660,260 560,260" fill="#172332" stroke="#2d405a" stroke-width="2" />
      <!-- A Ramp & Tetris -->
      <polygon points="620,720 740,720 720,440 640,440" fill="#172433" stroke="#2b3d56" stroke-width="2" />
      <!-- Palace -->
      <polygon points="800,640 940,640 920,460 820,460" fill="#17212e" stroke="#2c3c52" stroke-width="2" />
      <!-- A Site Floor -->
      <polygon points="660,460 840,460 840,300 660,300" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <!-- CT Spawn -->
      <polygon points="540,260 760,260 740,160 560,160" fill="#141c28" stroke="#253549" stroke-width="2" />

      <!-- Boxes / Structures -->
      <rect x="650" y="440" width="30" height="30" fill="#2d3f56" stroke="#486488" stroke-width="1.5" /> <!-- Tetris -->
      <rect x="720" y="360" width="40" height="40" fill="#2d3f56" stroke="#486488" stroke-width="1.5" /> <!-- Default Box -->
      <rect x="710" y="230" width="30" height="25" fill="#2d3f56" stroke="#486488" stroke-width="1.5" /> <!-- Ticket -->
      <rect x="180" y="340" width="30" height="30" fill="#2d3f56" stroke="#486488" stroke-width="1.5" /> <!-- Van -->
      <rect x="300" y="220" width="40" height="20" fill="#2d3f56" stroke="#486488" stroke-width="1.5" /> <!-- Bench -->
    </g>

    <!-- ==================================================== -->
    <!-- INFERNO VECTOR BLUEPRINT -->
    <!-- ==================================================== -->
    <g v-else-if="mapId === 'inferno'">
      <!-- T Spawn -->
      <polygon points="320,940 560,940 520,800 360,800" fill="#141c28" stroke="#253549" stroke-width="2" />
      <!-- Banana -->
      <polygon points="260,780 380,780 340,420 240,420" fill="#182433" stroke="#2d405a" stroke-width="2" />
      <!-- B Site Floor -->
      <polygon points="220,380 400,380 400,160 220,160" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <!-- Church / Ruins -->
      <polygon points="360,300 480,300 480,180 360,180" fill="#16212e" stroke="#2b3b51" stroke-width="2" />
      <!-- CT Spawn / Speedway -->
      <polygon points="440,200 620,200 620,120 440,120" fill="#141c28" stroke="#253549" stroke-width="2" />
      <!-- Mid & Second Mid -->
      <polygon points="420,780 660,780 620,540 440,540" fill="#172332" stroke="#2b3d56" stroke-width="2" />
      <!-- A Apartments / Boiler -->
      <polygon points="580,560 740,560 740,440 580,440" fill="#16212e" stroke="#2b3b51" stroke-width="2" />
      <!-- Short & Long A -->
      <polygon points="540,440 780,440 760,260 540,260" fill="#182434" stroke="#2e425c" stroke-width="2" />
      <!-- A Site & Pit -->
      <polygon points="620,360 840,360 840,220 620,220" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <!-- Pit / Moto -->
      <rect x="740" y="240" width="90" height="70" fill="#15202c" stroke="#283a50" stroke-width="1.5" />
    </g>

    <!-- ==================================================== -->
    <!-- DUST II VECTOR BLUEPRINT -->
    <!-- ==================================================== -->
    <g v-else-if="mapId === 'dust2'">
      <!-- T Spawn -->
      <polygon points="380,940 600,940 580,820 400,820" fill="#141c28" stroke="#253549" stroke-width="2" />
      <!-- Long Doors & Long A -->
      <polygon points="720,860 880,860 860,380 760,380" fill="#182433" stroke="#2d405a" stroke-width="2" />
      <!-- A Site & Cross -->
      <polygon points="700,380 880,380 880,220 680,220" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <!-- Catwalk / Short -->
      <polygon points="540,480 720,480 720,360 580,360" fill="#172332" stroke="#2b3d56" stroke-width="2" />
      <!-- Mid / Xbox / Doors -->
      <polygon points="440,780 580,780 560,460 460,460" fill="#182434" stroke="#2d415b" stroke-width="2" />
      <!-- Lower / Upper Tunnels -->
      <polygon points="180,680 380,680 340,420 180,420" fill="#16212e" stroke="#2b3b51" stroke-width="2" />
      <!-- B Site Floor -->
      <polygon points="120,360 320,360 320,180 120,180" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <!-- CT Spawn -->
      <polygon points="460,400 620,400 620,300 460,300" fill="#141c28" stroke="#253549" stroke-width="2" />
      <!-- Xbox Box -->
      <rect x="460" y="580" width="35" height="35" fill="#2d3f56" stroke="#486488" stroke-width="1.5" />
    </g>

    <!-- ==================================================== -->
    <!-- NUKE & OTHER MAPS DEFAULT VECTOR LAYOUT -->
    <!-- ==================================================== -->
    <g v-else>
      <!-- Central Tactical Layout Scheme -->
      <rect x="200" y="200" width="600" height="600" rx="30" fill="#141c28" stroke="#253549" stroke-width="2" />
      <polygon points="240,240 460,240 460,460 240,460" fill="#182434" stroke="#2e425c" stroke-width="2" />
      <polygon points="540,240 760,240 760,460 540,460" fill="#1a2738" stroke="#354b68" stroke-width="2" />
      <polygon points="240,540 460,540 460,760 240,760" fill="#172332" stroke="#2b3d56" stroke-width="2" />
      <polygon points="540,540 760,540 760,760 540,760" fill="#182434" stroke="#2d405a" stroke-width="2" />
      <rect x="440" y="440" width="120" height="120" fill="#1f2f42" stroke="#3b5475" stroke-width="2" />
    </g>

    <!-- BOMB SITE A ZONE GLOW -->
    <g :transform="`translate(${mapInfo.sites.a.x * 10}, ${mapInfo.sites.a.y * 10})`">
      <circle cx="0" cy="0" r="32" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 4" />
      <circle cx="0" cy="0" r="16" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-width="2" />
      <text x="0" y="6" font-size="16" font-weight="900" text-anchor="middle" fill="#fee2e2">A</text>
    </g>

    <!-- BOMB SITE B ZONE GLOW -->
    <g :transform="`translate(${mapInfo.sites.b.x * 10}, ${mapInfo.sites.b.y * 10})`">
      <circle cx="0" cy="0" r="32" fill="#ef4444" fill-opacity="0.12" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 4" />
      <circle cx="0" cy="0" r="16" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-width="2" />
      <text x="0" y="6" font-size="16" font-weight="900" text-anchor="middle" fill="#fee2e2">B</text>
    </g>

    <!-- CALLOUT LABELS (IF ENABLED) -->
    <g v-if="showCallouts" class="callouts-layer opacity-80 transition-opacity duration-200">
      <g 
        v-for="callout in mapInfo.callouts" 
        :key="callout.id" 
        :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10})`"
      >
        <circle cx="0" cy="0" r="2.5" fill="#64748b" />
        <text 
          x="0" 
          y="-6" 
          font-size="11" 
          font-weight="600" 
          text-anchor="middle" 
          fill="#94a3b8"
          class="tracking-wider uppercase font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        >
          {{ callout.name }}
        </text>
      </g>
    </g>
  </g>
</template>
