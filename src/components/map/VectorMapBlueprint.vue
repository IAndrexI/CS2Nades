<script setup lang="ts">
import { computed } from 'vue'
import type { MapInfo, RadarFloorId } from '../../types'
import { useMapStore } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'

const props = defineProps<{
  map?: MapInfo
  mapInfo?: MapInfo
  showCallouts?: boolean
}>()

const mapStore = useMapStore()
const lineupStore = useLineupStore()

const resolvedMap = computed<MapInfo>(() => {
  return props.map ?? props.mapInfo ?? mapStore.currentMap
})

const activeRadarImage = computed(() => {
  const m = resolvedMap.value
  const floorId: RadarFloorId = lineupStore.activeFloorId || 'upper'
  if (m.radarFloors && m.radarFloors.length > 0) {
    const matchedFloor = m.radarFloors.find((f) => f.id === floorId) ?? m.radarFloors[0]
    if (matchedFloor) {
      if (mapStore.radarSkin === 'simpleradar' && matchedFloor.simpleRadarImage) {
        return matchedFloor.simpleRadarImage
      }
      return matchedFloor.image
    }
  }
  if (mapStore.radarSkin === 'simpleradar' && m.simpleRadarImage) {
    return m.simpleRadarImage
  }
  return m.radarImage
})

const viewBoxDims = computed(() => {
  const parts = (resolvedMap.value.viewBox || '0 0 1000 1000').split(' ').map(Number)
  return {
    width: parts[2] || 1000,
    height: parts[3] || 1000
  }
})

const visibleCallouts = computed(() => {
  if (!props.showCallouts && !mapStore.showCallouts) return []
  return resolvedMap.value.callouts.filter(
    (c) => !c.floor || c.floor === lineupStore.activeFloorId
  )
})
</script>

<template>
  <g class="radar-canvas-layer select-none pointer-events-none">
    <!-- Pure dark radar canvas backing -->
    <rect
      x="0"
      y="0"
      width="1000"
      height="1000"
      fill="#070a0f"
    />

    <!-- Official / SimpleRadar 1024x1024 Calibrated Radar Texture -->
    <image
      v-if="activeRadarImage"
      :href="activeRadarImage"
      x="0"
      y="0"
      width="1000"
      height="1000"
      preserveAspectRatio="none"
      :class="[
        'transition-opacity duration-200',
        mapStore.radarSkin === 'blueprint' ? 'opacity-65 contrast-125 saturate-50' : 'opacity-100'
      ]"
    />

    <!-- Optional Blueprint Tactical Coordinate Grid Overlay -->
    <g v-if="mapStore.radarSkin === 'blueprint'" opacity="0.18">
      <line
        v-for="i in 9"
        :key="'vg-' + i"
        :x1="i * 100"
        y1="0"
        :x2="i * 100"
        :y2="viewBoxDims.height"
        stroke="#38bdf8"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <line
        v-for="i in 9"
        :key="'hg-' + i"
        x1="0"
        :y1="i * 100"
        :x2="viewBoxDims.width"
        :y2="i * 100"
        stroke="#38bdf8"
        stroke-width="1"
        stroke-dasharray="4 4"
      />
    </g>

    <!-- Optional Callout Names Overlay -->
    <g v-if="visibleCallouts.length > 0" class="callout-labels-layer">
      <g
        v-for="callout in visibleCallouts"
        :key="callout.id"
        :transform="`translate(${callout.coords.x * 10}, ${callout.coords.y * 10})`"
      >
        <rect
          x="-54"
          y="-10"
          width="108"
          height="19"
          rx="4"
          fill="#090d16"
          fill-opacity="0.82"
          stroke="#334155"
          stroke-width="1"
        />
        <text
          x="0"
          y="3"
          text-anchor="middle"
          fill="#cbd5e1"
          font-size="9.5"
          font-weight="700"
          font-family="Inter, system-ui, sans-serif"
        >
          {{ callout.name }}
        </text>
      </g>
    </g>
  </g>
</template>
