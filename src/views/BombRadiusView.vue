<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMapStore } from '../stores/mapStore'
import VectorMapBlueprint from '../components/map/VectorMapBlueprint.vue'
import {
  clientToSvgRadarPct,
  getMapCalibration,
  radarToWorldCoords
} from '../core/radar/coordinateEngine'
import { isPointInMapBounds, snapPointToMapBounds } from '../core/radar/mapBounds'
import {
  computeBombShockwaveField,
  traceShockwavePath,
  renderShockwaveHeatmapDataUrl
} from '../core/radar/bombShockwave'
import type { Point2D, RadarFloorId } from '../types'
import {
  Bomb,
  Shield,
  ShieldOff,
  Heart,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Terminal,
  Check
} from 'lucide-vue-next'

const mapStore = useMapStore()

// Official CS2 C4Radius (Hammer units) per map
const MAP_C4_RADIUS: Record<string, number> = {
  mirage: 650,
  dust2: 500,
  inferno: 500,
  nuke: 650,
  ancient: 650,
  anubis: 600,
  cache: 500,
  train: 500,
  vertigo: 500,
  overpass: 650,
  cobblestone: 500
}

const playerHp = ref<number>(100)
const hasArmor = ref<boolean>(true)
const physicsMode = ref<'shockwave' | 'legacy'>('shockwave')
const lockToSites = ref<boolean>(false)
const bombFloor = ref<RadarFloorId>('upper')
const playerFloor = ref<RadarFloorId>('upper')
const copiedDebugCmd = ref<string | null>(null)

function copyDebugCmd(cmd: string, key: string) {
  navigator.clipboard?.writeText(cmd).catch(() => {})
  copiedDebugCmd.value = key
  setTimeout(() => {
    copiedDebugCmd.value = null
  }, 2000)
}

const bombCoords = ref<Point2D>({
  x: mapStore.currentMap.sites.a.x,
  y: mapStore.currentMap.sites.a.y
})

const svgElement = ref<SVGSVGElement | null>(null)
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const isDraggingBomb = ref(false)
const panStart = ref({ x: 0, y: 0 })
const didDrag = ref(false)
const cursorPct = ref<Point2D | null>(null)

const hasFloors = computed(() =>
  Boolean(mapStore.currentMap.radarFloors && mapStore.currentMap.radarFloors.length > 0)
)

const activeDutyMaps = computed(() => mapStore.availableMaps.filter((m) => m.activePool))
const reserveAndClassicMaps = computed(() => mapStore.availableMaps.filter((m) => !m.activePool))

const bombRadius = computed(() => MAP_C4_RADIUS[mapStore.currentMapId] ?? 500)
const maxBlastRadius = computed(() => bombRadius.value * 3.5)
const sigma = computed(() => maxBlastRadius.value / 3)

const mapCalibration = computed(() => getMapCalibration(mapStore.currentMapId))

function hammerToSvgRadius(hammerDist: number): number {
  const scale = mapCalibration.value.scale || 5.0
  return (hammerDist / scale) * (1000 / 1024)
}

function calculateBombDamage(hammerDist: number, armor: boolean): number {
  if (hammerDist > maxBlastRadius.value) return 0
  const s = sigma.value
  const raw = bombRadius.value * Math.exp(-(hammerDist * hammerDist) / (2 * s * s))
  const finalDmg = armor ? raw * 0.5 : raw
  return Math.max(0, Math.round(finalDmg))
}

function distanceForDamage(targetDamage: number, armor: boolean): number {
  const rawTarget = armor ? targetDamage * 2 : targetDamage
  if (rawTarget <= 0) return maxBlastRadius.value
  if (rawTarget >= bombRadius.value) return 0
  const s = sigma.value
  const d = Math.sqrt(-2 * s * s * Math.log(rawTarget / bombRadius.value))
  return Math.min(maxBlastRadius.value, Math.round(d))
}

function plantAtSite(site: 'a' | 'b') {
  const target = site === 'a' ? mapStore.currentMap.sites.a : mapStore.currentMap.sites.b
  if (hasFloors.value) {
    bombFloor.value = mapStore.currentMapId === 'nuke' && site === 'b' ? 'lower' : 'upper'
    playerFloor.value = bombFloor.value
  }
  bombCoords.value = { x: target.x, y: target.y }
}

watch(
  () => mapStore.currentMapId,
  () => {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
    bombFloor.value = 'upper'
    playerFloor.value = 'upper'
    plantAtSite('a')
  }
)

function getZOffset(): number {
  if (!hasFloors.value || bombFloor.value === playerFloor.value) return 0
  if (mapStore.currentMapId === 'nuke') return 260
  if (mapStore.currentMapId === 'vertigo') return 230
  return 0
}

const blastRings = computed(() => {
  const lethalDist = distanceForDamage(playerHp.value, hasArmor.value)
  const heavyDist = distanceForDamage(75, hasArmor.value)
  const modDist = distanceForDamage(50, hasArmor.value)
  const lightDist = distanceForDamage(25, hasArmor.value)
  const edgeDist = Math.round(maxBlastRadius.value)

  const rings = [
    { id: 'edge', label: 'Max Blast (1+ DMG)', dist: edgeDist, color: '#10b981', fillOpacity: 0.06 },
    { id: 'light', label: '25+ DMG', dist: lightDist, color: '#eab308', fillOpacity: 0.08 },
    { id: 'mod', label: '50+ DMG', dist: modDist, color: '#f59e0b', fillOpacity: 0.1 },
    { id: 'heavy', label: '75+ DMG', dist: heavyDist, color: '#f97316', fillOpacity: 0.12 },
    {
      id: 'lethal',
      label: `Lethal (${playerHp.value}+ DMG)`,
      dist: lethalDist,
      color: '#ef4444',
      fillOpacity: 0.18
    }
  ]

  return rings
    .filter((r) => r.dist > 0)
    .map((r) => ({
      ...r,
      svgR: Number(hammerToSvgRadius(r.dist).toFixed(2))
    }))
})

const shockwaveField = computed(() => {
  if (physicsMode.value !== 'shockwave') return null
  return computeBombShockwaveField(
    mapStore.currentMapId,
    bombCoords.value,
    bombRadius.value,
    hasFloors.value ? bombFloor.value : undefined
  )
})

const shockwaveHeatmapUrl = computed(() => {
  if (!shockwaveField.value) return ''
  return renderShockwaveHeatmapDataUrl(shockwaveField.value, playerHp.value)
})

const cursorShockwavePath = computed(() => {
  if (!shockwaveField.value || !cursorPct.value) return []
  return traceShockwavePath(shockwaveField.value, cursorPct.value)
})

const cursorMetrics = computed(() => {
  if (!cursorPct.value) return null
  const bWorld = radarToWorldCoords(mapStore.currentMapId, bombCoords.value, 0)
  const cWorld = radarToWorldCoords(mapStore.currentMapId, cursorPct.value, 0)
  const dz = getZOffset()
  const directHammer = Math.round(
    Math.hypot(cWorld.x - bWorld.x, cWorld.y - bWorld.y, dz)
  )

  if (physicsMode.value === 'shockwave' && shockwaveField.value) {
    const cx = Math.max(0, Math.min(99, Math.floor(cursorPct.value.x)))
    const cy = Math.max(0, Math.min(99, Math.floor(cursorPct.value.y)))
    const idx = cy * 100 + cx
    const pDist = shockwaveField.value.pathDist[idx]!
    const eff2D = shockwaveField.value.effectiveDist[idx]!
    const isBehindWall = shockwaveField.value.behindWall[idx] === 1
    let dmg = shockwaveField.value.damage[idx]!
    if (dz > 0 && eff2D >= 0) {
      const eff3D = Math.hypot(eff2D, dz)
      dmg = calculateBombDamage(eff3D, false)
    }
    const legacyDmg = calculateBombDamage(directHammer, false)
    const savedByCover = Math.max(0, legacyDmg - dmg)
    const channeledBoost = Math.max(0, dmg - legacyDmg)
    const hpLeft = Math.max(0, playerHp.value - dmg)
    const survives = hpLeft > 0
    const distHammer = pDist >= 0 ? Math.round(pDist) : directHammer
    const distMeters = (distHammer * 0.01905).toFixed(1)
    return {
      distHammer,
      directHammer,
      distMeters,
      dmg,
      hpLeft,
      survives,
      isBehindWall,
      savedByCover,
      channeledBoost,
      unreachable: pDist < 0
    }
  }

  const dmg = calculateBombDamage(directHammer, hasArmor.value)
  const hpLeft = Math.max(0, playerHp.value - dmg)
  const survives = hpLeft > 0
  const distMeters = (directHammer * 0.01905).toFixed(1)
  return {
    distHammer: directHammer,
    directHammer,
    distMeters,
    dmg,
    hpLeft,
    survives,
    isBehindWall: false,
    savedByCover: 0,
    channeledBoost: 0,
    unreachable: false
  }
})

const survivalThresholds = computed(() => {
  return [100, 75, 50, 25].map((hp) => {
    const d = distanceForDamage(hp, hasArmor.value)
    return {
      hp,
      distHammer: d,
      distMeters: (d * 0.01905).toFixed(1)
    }
  })
})

function handleZoomIn() {
  zoom.value = Math.min(Number((zoom.value + 0.35).toFixed(2)), 4.0)
}

function handleZoomOut() {
  zoom.value = Math.max(Number((zoom.value - 0.35).toFixed(2)), 1.0)
  if (zoom.value <= 1) {
    zoom.value = 1
    pan.value = { x: 0, y: 0 }
  }
}

function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) handleZoomIn()
  else handleZoomOut()
}

function placeBombAt(pt: Point2D) {
  if (lockToSites.value) {
    const siteA = mapStore.currentMap.sites.a
    const siteB = mapStore.currentMap.sites.b
    const dA = Math.hypot(pt.x - siteA.x, pt.y - siteA.y)
    const dB = Math.hypot(pt.x - siteB.x, pt.y - siteB.y)
    if (dA <= 11 || dB <= 11) {
      const snapped = snapPointToMapBounds(mapStore.currentMapId, pt, bombFloor.value)
      bombCoords.value = { x: snapped.x, y: snapped.y }
    } else {
      plantAtSite(dA <= dB ? 'a' : 'b')
    }
    return
  }

  const snapped = snapPointToMapBounds(mapStore.currentMapId, pt, bombFloor.value)
  bombCoords.value = { x: snapped.x, y: snapped.y }
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0 || !svgElement.value) return
  didDrag.value = false
  const pt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  if (
    pt &&
    (zoom.value <= 1.01 || Math.hypot(pt.x - bombCoords.value.x, pt.y - bombCoords.value.y) <= 4.5)
  ) {
    isDraggingBomb.value = true
    placeBombAt(pt)
    return
  }
  isPanning.value = true
  panStart.value = { x: e.clientX - pan.value.x, y: e.clientY - pan.value.y }
}

function handleMouseMove(e: MouseEvent) {
  if (svgElement.value) {
    cursorPct.value = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  }
  if (isDraggingBomb.value && cursorPct.value) {
    didDrag.value = true
    placeBombAt(cursorPct.value)
    return
  }
  if (!isPanning.value) return
  const nextX = e.clientX - panStart.value.x
  const nextY = e.clientY - panStart.value.y
  if (Math.hypot(nextX - pan.value.x, nextY - pan.value.y) > 4) {
    didDrag.value = true
  }
  const limit = 340 * Math.max(0.2, zoom.value - 1)
  pan.value = {
    x: Math.max(-limit, Math.min(limit, nextX)),
    y: Math.max(-limit, Math.min(limit, nextY))
  }
}

function handleMouseUp() {
  isDraggingBomb.value = false
  isPanning.value = false
}

function handleMapClick(e: MouseEvent) {
  if (didDrag.value || !svgElement.value) return
  const pt = clientToSvgRadarPct(svgElement.value, e.clientX, e.clientY, true)
  if (!pt) return
  if (isPointInMapBounds(mapStore.currentMapId, pt, bombFloor.value) || !lockToSites.value) {
    placeBombAt(pt)
  }
}
</script>

<template>
  <div class="bomb-radius-view max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 animate-fade-in">
    <!-- HEADER & MAP SELECTOR -->
    <div class="flex flex-col gap-4 p-5 bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl">
            <Bomb class="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-lg sm:text-xl font-semibold text-white tracking-tight">
                CS2 Bomb Damage Radius Calculator
              </h1>
              <span class="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
                {{ mapStore.currentMap.name }} • C4 Radius {{ bombRadius }}u
                <template v-if="physicsMode === 'shockwave' && shockwaveField">
                  • Corridor Reach {{ shockwaveField.maxCorridorReach }}u ({{ (shockwaveField.maxCorridorReach * 0.01905).toFixed(1) }}m)
                </template>
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Click or drag the C4 anywhere on the map and hover any position to see exact blast damage, Kevlar mitigation, and survival distance
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="plantAtSite('a')"
            class="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Plant Site A
          </button>
          <button
            @click="plantAtSite('b')"
            class="px-3 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Plant Site B
          </button>
          <button
            @click="lockToSites = !lockToSites"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
              lockToSites
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                : 'bg-slate-800/70 text-slate-300 border-white/[0.08] hover:text-white'
            ]"
          >
            <Lock v-if="lockToSites" class="w-3.5 h-3.5" />
            <Unlock v-else class="w-3.5 h-3.5" />
            <span>{{ lockToSites ? 'Sites Only' : 'Free Plant' }}</span>
          </button>

          <div class="inline-flex items-center p-0.5 bg-slate-950/90 border border-white/[0.08] rounded-xl">
            <button
              @click="physicsMode = 'shockwave'"
              :class="[
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
                physicsMode === 'shockwave' ? 'bg-white text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              ]"
            >
              CS2 Shockwave (Walls Block)
            </button>
            <button
              @click="physicsMode = 'legacy'"
              :class="[
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
                physicsMode === 'legacy' ? 'bg-white text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
              ]"
            >
              Legacy Sphere
            </button>
          </div>
        </div>
      </div>

      <!-- MAP PILL SELECTOR -->
      <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/[0.06]">
        <span class="text-[11px] font-medium text-slate-400 mr-1">Active Duty (7):</span>
        <button
          v-for="map in activeDutyMaps"
          :key="map.id"
          @click="mapStore.setMap(map.id)"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
            mapStore.currentMapId === map.id
              ? 'bg-white text-slate-950 font-semibold shadow-sm'
              : 'bg-slate-950/60 text-slate-300 hover:text-white border border-white/[0.06]'
          ]"
        >
          {{ map.name }}
        </button>

        <span class="text-slate-700 mx-1">|</span>
        <span class="text-[11px] font-medium text-slate-400 mr-1">Reserve &amp; Classic (4):</span>
        <button
          v-for="map in reserveAndClassicMaps"
          :key="map.id"
          @click="mapStore.setMap(map.id)"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
            mapStore.currentMapId === map.id
              ? 'bg-white text-slate-950 font-semibold shadow-sm'
              : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/[0.06]'
          ]"
        >
          {{ map.name }}
        </button>
      </div>
    </div>

    <!-- MAIN GRID: RADAR (LEFT) | CALCULATOR & SURVIVAL PANEL (RIGHT) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- LEFT 2 COLS: INTERACTIVE BLAST RADAR -->
      <div class="lg:col-span-2 bg-slate-950/95 rounded-2xl border border-white/[0.08] shadow-2xl p-3 sm:p-4 flex flex-col gap-3 select-none">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-[11px] font-mono bg-slate-900/90 border border-white/[0.08] rounded-xl px-3 py-1.5">
            <template v-if="cursorMetrics">
              <span class="text-slate-300">
                Dist: <strong class="text-white">{{ cursorMetrics.distHammer }}u</strong> ({{ cursorMetrics.distMeters }}m)
              </span>
              <span class="text-slate-600">|</span>
              <span :class="cursorMetrics.survives ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'">
                {{ cursorMetrics.dmg }} DMG • {{ cursorMetrics.survives ? `${cursorMetrics.hpLeft} HP Left` : 'FATAL' }}
              </span>
            </template>
            <span v-else class="text-slate-500">Hover anywhere on the radar to calculate C4 blast damage</span>
          </div>

          <div class="flex items-center gap-1 bg-slate-900/90 border border-white/[0.08] rounded-xl p-1">
            <button @click="handleZoomOut" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer" title="Zoom Out">
              <ZoomOut class="w-3.5 h-3.5" />
            </button>
            <span class="text-[11px] font-mono text-slate-300 px-2 min-w-[44px] text-center">{{ Math.round(zoom * 100) }}%</span>
            <button @click="handleZoomIn" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer" title="Zoom In">
              <ZoomIn class="w-3.5 h-3.5" />
            </button>
            <button @click="resetView" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer" title="Reset View">
              <RotateCcw class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          class="relative w-full max-w-[680px] mx-auto aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070a0f]"
          :class="isDraggingBomb ? 'cursor-grabbing' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'"
          @wheel="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp(); cursorPct = null"
          @click="handleMapClick"
        >
          <!-- FLOATING HOVER DAMAGE HUD -->
          <div
            v-if="cursorMetrics"
            class="absolute bottom-3 right-3 z-30 px-3.5 py-2.5 bg-slate-950/90 backdrop-blur-xl border border-white/[0.14] rounded-xl shadow-2xl pointer-events-none text-xs"
          >
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="cursorMetrics.survives" class="w-4 h-4 text-emerald-400" />
              <AlertTriangle v-else class="w-4 h-4 text-rose-400" />
              <span class="font-semibold" :class="cursorMetrics.survives ? 'text-emerald-300' : 'text-rose-300'">
                {{ cursorMetrics.survives ? `SURVIVES (${cursorMetrics.hpLeft} HP)` : 'LETHAL BLAST' }}
              </span>
              <span
                v-if="physicsMode === 'shockwave'"
                :class="[
                  'px-1.5 py-0.5 rounded text-[9px] font-mono uppercase',
                  cursorMetrics.isBehindWall || cursorMetrics.unreachable
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                ]"
              >
                {{ cursorMetrics.unreachable ? 'Solid Wall' : cursorMetrics.isBehindWall ? 'Covered by Wall' : 'Direct Blast' }}
              </span>
            </div>
            <div class="text-[11px] font-mono text-slate-300 mt-1">
              Damage: <strong class="text-white">{{ cursorMetrics.dmg }}</strong> • Path {{ cursorMetrics.distHammer }}u ({{ cursorMetrics.distMeters }}m)
            </div>
            <div v-if="cursorMetrics.savedByCover > 0" class="text-[10px] font-mono text-emerald-400 mt-0.5">
              Wall Cover Saved: -{{ cursorMetrics.savedByCover }} DMG
            </div>
            <div v-else-if="cursorMetrics.channeledBoost > 0" class="text-[10px] font-mono text-amber-400 mt-0.5">
              Hallway Channeled: +{{ cursorMetrics.channeledBoost }} DMG vs Open Air
            </div>
          </div>

          <svg
            ref="svgElement"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            class="w-full h-full aspect-square block transition-transform duration-75 ease-out"
            :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
          >
            <VectorMapBlueprint :map-info="mapStore.currentMap" :show-callouts="false" />

            <!-- CS2 SHOCKWAVE WALL-OCCLUDED HEATMAP OVERLAY -->
            <image
              v-if="physicsMode === 'shockwave' && shockwaveHeatmapUrl"
              :href="shockwaveHeatmapUrl"
              x="0"
              y="0"
              width="1000"
              height="1000"
              preserveAspectRatio="none"
              class="pointer-events-none opacity-90"
            />

            <!-- CONCENTRIC BLAST RINGS (FULL IN LEGACY MODE, SUBTLE REFERENCE IN SHOCKWAVE MODE) -->
            <g class="blast-rings-layer pointer-events-none">
              <circle
                v-for="ring in blastRings"
                :key="ring.id"
                :cx="bombCoords.x * 10"
                :cy="bombCoords.y * 10"
                :r="ring.svgR"
                :fill="physicsMode === 'legacy' ? ring.color : 'none'"
                :fill-opacity="physicsMode === 'legacy' ? ring.fillOpacity : 0"
                :stroke="ring.color"
                :stroke-width="physicsMode === 'legacy' ? 1.6 : 1.1"
                stroke-dasharray="5 4"
                :stroke-opacity="physicsMode === 'legacy' ? 0.85 : 0.42"
              />
            </g>

            <!-- SHOCKWAVE CORRIDOR PATH OR DIRECT DISTANCE LINE -->
            <polyline
              v-if="physicsMode === 'shockwave' && cursorShockwavePath.length >= 2"
              :points="cursorShockwavePath.map((p) => `${p.x * 10},${p.y * 10}`).join(' ')"
              fill="none"
              :stroke="cursorMetrics?.survives ? '#10b981' : '#ef4444'"
              stroke-width="2.2"
              stroke-dasharray="5 3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="pointer-events-none"
            />
            <line
              v-else-if="cursorPct"
              :x1="bombCoords.x * 10"
              :y1="bombCoords.y * 10"
              :x2="cursorPct.x * 10"
              :y2="cursorPct.y * 10"
              :stroke="cursorMetrics?.survives ? '#10b981' : '#ef4444'"
              stroke-width="1.8"
              stroke-dasharray="4 3"
              class="pointer-events-none"
            />

            <!-- C4 BOMB MARKER -->
            <g :transform="`translate(${bombCoords.x * 10}, ${bombCoords.y * 10})`" class="cursor-grab">
              <circle cx="0" cy="0" r="16" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-width="2" />
              <rect x="-9" y="-7" width="18" height="14" rx="3" fill="#18181b" stroke="#ef4444" stroke-width="1.8" />
              <circle cx="-4" cy="0" r="2" fill="#ef4444" class="animate-pulse" />
              <text x="3" y="2.5" font-size="6.5" font-family="monospace" font-weight="900" fill="#ef4444" text-anchor="middle">C4</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- RIGHT 1 COL: SURVIVAL SETTINGS & THRESHOLDS -->
      <div class="p-5 bg-slate-900/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col gap-5 text-xs">
        <div>
          <h2 class="text-sm font-semibold text-white">Player &amp; Armor Settings</h2>
          <p class="text-[11px] text-slate-400 mt-0.5">Adjust your HP and Kevlar to update lethal &amp; survival rings</p>
        </div>

        <!-- HP SLIDER -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1.5 font-medium text-slate-200">
              <Heart class="w-3.5 h-3.5 text-rose-400" />
              Player Health
            </span>
            <span class="font-mono font-bold text-white">{{ playerHp }} HP</span>
          </div>
          <input v-model.number="playerHp" type="range" min="1" max="100" class="w-full accent-rose-500 cursor-pointer" />
          <div class="flex items-center gap-1.5">
            <button
              v-for="hp in [100, 75, 50, 25, 10]"
              :key="hp"
              @click="playerHp = hp"
              :class="[
                'flex-1 py-1 rounded-lg font-mono text-[11px] font-semibold border transition-colors cursor-pointer',
                playerHp === hp
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-950/60 text-slate-400 border-white/[0.06] hover:text-white'
              ]"
            >
              {{ hp }}
            </button>
          </div>
        </div>

        <!-- KEVLAR TOGGLE / CS2 ARMOR NOTE -->
        <div class="flex items-center justify-between p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl">
          <span class="flex items-center gap-2 font-medium text-slate-200">
            <Shield v-if="hasArmor && physicsMode === 'legacy'" class="w-4 h-4 text-sky-400" />
            <ShieldOff v-else class="w-4 h-4 text-slate-500" />
            <span>{{ physicsMode === 'shockwave' ? 'CS2 Kevlar (0% C4 Reduction)' : 'Kevlar Armor (50% Reduction)' }}</span>
          </span>
          <button
            v-if="physicsMode === 'legacy'"
            @click="hasArmor = !hasArmor"
            :class="[
              'px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer',
              hasArmor ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            ]"
          >
            {{ hasArmor ? 'Equipped' : 'No Armor' }}
          </button>
          <span v-else class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-mono">
            Season 5 Rework
          </span>
        </div>

        <!-- IN-GAME VALVE DEBUG COMMANDS -->
        <div class="flex flex-col gap-2 p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl">
          <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">In-Game CS2 Blast Debug</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="copyDebugCmd('sv_cheats 1; cl_bake_bomb_damage_debug 1', 'dbg-a')"
              class="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] rounded-lg text-[11px] text-slate-200 cursor-pointer"
            >
              <Check v-if="copiedDebugCmd === 'dbg-a'" class="w-3 h-3 text-emerald-400" />
              <Terminal v-else class="w-3 h-3 text-sky-400" />
              <span>{{ copiedDebugCmd === 'dbg-a' ? 'Copied!' : 'Site A Debug' }}</span>
            </button>
            <button
              @click="copyDebugCmd('sv_cheats 1; cl_bake_bomb_damage_debug 2', 'dbg-b')"
              class="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] rounded-lg text-[11px] text-slate-200 cursor-pointer"
            >
              <Check v-if="copiedDebugCmd === 'dbg-b'" class="w-3 h-3 text-emerald-400" />
              <Terminal v-else class="w-3 h-3 text-sky-400" />
              <span>{{ copiedDebugCmd === 'dbg-b' ? 'Copied!' : 'Site B Debug' }}</span>
            </button>
          </div>
        </div>

        <!-- FLOOR SELECTOR FOR NUKE / VERTIGO -->
        <div v-if="hasFloors" class="flex flex-col gap-2 p-3 bg-slate-950/70 border border-white/[0.06] rounded-xl">
          <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Multi-Floor Elevation</span>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="playerFloor = 'upper'"
              :class="[
                'py-1.5 rounded-lg text-xs font-medium border cursor-pointer',
                playerFloor === 'upper' ? 'bg-white text-slate-950 font-semibold' : 'bg-slate-900 text-slate-400 border-white/[0.06]'
              ]"
            >
              Player Upper
            </button>
            <button
              @click="playerFloor = 'lower'"
              :class="[
                'py-1.5 rounded-lg text-xs font-medium border cursor-pointer',
                playerFloor === 'lower' ? 'bg-white text-slate-950 font-semibold' : 'bg-slate-900 text-slate-400 border-white/[0.06]'
              ]"
            >
              Player Lower
            </button>
          </div>
        </div>

        <!-- RING LEGEND -->
        <div class="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
          <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Blast Ring Legend</span>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="ring in [...blastRings].reverse()"
              :key="ring.id"
              class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/[0.05]"
            >
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: ring.color }"></span>
                <span class="text-slate-200 font-medium">{{ ring.label }}</span>
              </div>
              <span class="font-mono text-slate-400">{{ ring.dist }}u</span>
            </div>
          </div>
        </div>

        <!-- SURVIVAL THRESHOLDS TABLE -->
        <div class="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
          <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Minimum Safe Distance ({{ hasArmor ? 'With Armor' : 'No Armor' }})
          </span>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="row in survivalThresholds"
              :key="row.hp"
              class="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.05] flex flex-col"
            >
              <span class="text-[10px] text-slate-400">At {{ row.hp }} HP</span>
              <span class="font-mono font-semibold text-white text-xs mt-0.5">{{ row.distHammer }}u ({{ row.distMeters }}m)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
