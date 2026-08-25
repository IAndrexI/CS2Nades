<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import type { MapInfo } from '../../types'
import { parseViewBox, pctToSvg } from '../../utils/radarCoords'

const props = defineProps<{
  mapInfo: MapInfo
  showCallouts?: boolean
}>()

const mapStore = useMapStore()
const mapId = computed(() => props.mapInfo.id)
const hasRadarImage = computed(() => !!props.mapInfo.radarImage && mapStore.radarMode !== 'blueprint')
const vb = computed(() => parseViewBox(props.mapInfo.viewBox))
const floors = computed(() => {
  if (props.mapInfo.customRadarImage) return []
  return props.mapInfo.radarFloors || []
})
const useSplit = computed(() => floors.value.length === 2)
const callouts = computed(() => {
  const custom = mapStore.customCallouts[props.mapInfo.id] || []
  return [...(props.mapInfo.callouts || []), ...custom]
})

function siteSvg(site: { x: number; y: number }) {
  return pctToSvg(site, props.mapInfo.viewBox)
}
</script>

<template>
  <g class="vector-map-layer select-none pointer-events-none">
    <rect :x="vb.minX" :y="vb.minY" :width="vb.width" :height="vb.height" fill="#090d13" />

    <g v-if="!useSplit">
      <circle :cx="vb.width / 2" :cy="vb.height / 2" :r="vb.height * 0.48" fill="none" stroke="#182332" stroke-width="1.5" stroke-dasharray="8 8" />
      <circle :cx="vb.width / 2" :cy="vb.height / 2" :r="vb.height * 0.32" fill="none" stroke="#182332" stroke-width="1" stroke-dasharray="6 6" />
      <line :x1="vb.width / 2" :y1="20" :x2="vb.width / 2" :y2="vb.height - 20" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />
      <line :x1="20" :y1="vb.height / 2" :x2="vb.width - 20" :y2="vb.height / 2" stroke="#131b26" stroke-width="1" stroke-dasharray="4 4" />
    </g>

    <!-- Split upper | lower radars (Nuke, Vertigo) -->
    <g v-if="hasRadarImage && useSplit" class="radar-split-layer">
      <image
        v-for="(floor, idx) in floors"
        :key="floor.id"
        :href="floor.image"
        :x="idx * (vb.width / 2)"
        :y="0"
        :width="vb.width / 2"
        :height="vb.height"
        preserveAspectRatio="xMidYMid meet"
        :opacity="mapStore.radarOpacity"
      />
      <line
        :x1="vb.width / 2"
        y1="0"
        :x2="vb.width / 2"
        :y2="vb.height"
        stroke="#334155"
        stroke-width="3"
      />
      <g v-for="(floor, idx) in floors" :key="`label-${floor.id}`">
        <rect
          :x="idx * (vb.width / 2) + 16"
          y="16"
          width="110"
          height="32"
          rx="8"
          fill="#0b0e14"
          fill-opacity="0.82"
          stroke="#de9b35"
          stroke-opacity="0.45"
        />
        <text
          :x="idx * (vb.width / 2) + 71"
          y="38"
          font-size="14"
          font-weight="800"
          text-anchor="middle"
          fill="#fbbf24"
          font-family="monospace"
        >{{ floor.label.toUpperCase() }}</text>
      </g>
    </g>

    <g v-else-if="hasRadarImage" class="radar-image-layer">
      <image
        :href="props.mapInfo.radarImage"
        :x="0"
        :y="0"
        :width="vb.width"
        :height="vb.height"
        preserveAspectRatio="xMidYMid meet"
        :opacity="mapStore.radarOpacity"
        class="transition-opacity duration-200"
      />
    </g>

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
        <rect :x="vb.width * 0.2" :y="vb.height * 0.2" :width="vb.width * 0.6" :height="vb.height * 0.6" rx="30" fill="#141c28" stroke="#253549" stroke-width="2" />
      </g>
    </g>

    <g v-if="mapStore.showSiteMarkers || mapStore.radarMode === 'blueprint'">
      <g
        v-if="mapInfo.sites?.a"
        :transform="`translate(${siteSvg(mapInfo.sites.a).x}, ${siteSvg(mapInfo.sites.a).y})`"
      >
        <circle cx="0" cy="0" r="28" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 4" />
        <circle cx="0" cy="0" r="14" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" />
        <text x="0" y="5" font-size="14" font-weight="900" text-anchor="middle" fill="#fee2e2" font-family="monospace">A</text>
      </g>
      <g
        v-if="mapInfo.sites?.b"
        :transform="`translate(${siteSvg(mapInfo.sites.b).x}, ${siteSvg(mapInfo.sites.b).y})`"
      >
        <circle cx="0" cy="0" r="28" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 4" />
        <circle cx="0" cy="0" r="14" fill="#ef4444" fill-opacity="0.3" stroke="#ef4444" stroke-width="2" />
        <text x="0" y="5" font-size="14" font-weight="900" text-anchor="middle" fill="#fee2e2" font-family="monospace">B</text>
      </g>
    </g>

    <g v-if="showCallouts" class="callouts-layer opacity-85 transition-opacity duration-200">
      <g
        v-for="callout in callouts"
        :key="callout.id"
        :transform="`translate(${siteSvg(callout.coords).x}, ${siteSvg(callout.coords).y})`"
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
