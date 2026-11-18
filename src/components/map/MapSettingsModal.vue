<script setup lang="ts">
import { useMapStore, type RadarSkin } from '../../stores/mapStore'
import { useLineupStore } from '../../stores/lineupStore'
import { useCS2ServerStore } from '../../stores/cs2ServerStore'
import { Check, Eye, Layers, Navigation, SlidersHorizontal, Tag, X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    isOpen?: boolean
  }>(),
  {
    isOpen: true
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()
const lineupStore = useLineupStore()
const cs2Store = useCS2ServerStore()

const skins: { id: RadarSkin; label: string; desc: string }[] = [
  {
    id: 'simpleradar',
    label: 'SimpleRadar High-Contrast',
    desc: 'High-visibility competitive callout radar textures'
  },
  {
    id: 'official',
    label: 'Official Valve CS2 Radar',
    desc: 'Standard in-game CS2 1024×1024 radar overview'
  },
  {
    id: 'blueprint',
    label: 'Tactical Coordinate Grid',
    desc: 'Blueprint overlay with 10% coordinate calibration lines'
  }
]
</script>

<template>
  <div
    v-if="props.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div class="flex items-center gap-2.5">
          <SlidersHorizontal class="w-4 h-4 text-amber-400" />
          <h3 class="text-sm font-bold text-white uppercase tracking-wider">
            Precision Radar Settings
          </h3>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-5">
        <!-- Radar Texture Style -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Radar Map Texture
          </label>
          <div class="space-y-2">
            <button
              v-for="skin in skins"
              :key="skin.id"
              @click="mapStore.radarSkin = skin.id"
              :class="[
                'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer',
                mapStore.radarSkin === skin.id
                  ? 'bg-amber-500/15 border-amber-500/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              ]"
            >
              <div>
                <div class="text-xs font-bold">{{ skin.label }}</div>
                <div class="text-[11px] text-slate-400">{{ skin.desc }}</div>
              </div>
              <Check
                v-if="mapStore.radarSkin === skin.id"
                class="w-4 h-4 text-amber-400 shrink-0"
              />
            </button>
          </div>
        </div>

        <!-- Radar Layer Toggles -->
        <div class="space-y-2.5 pt-2 border-t border-slate-800/80">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Overlay Layers
          </label>

          <label
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Layers class="w-4 h-4 text-sky-400" />
              <div>
                <div class="text-xs font-semibold text-white">Show All Flight Trajectories</div>
                <div class="text-[10px] text-slate-400">
                  Draw ballistic arcs between throw & landing pins
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="mapStore.showTrajectories"
              class="accent-amber-500 w-4 h-4"
            />
          </label>

          <label
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Tag class="w-4 h-4 text-amber-400" />
              <div>
                <div class="text-xs font-semibold text-white">Show CS2 Map Callout Zones</div>
                <div class="text-[10px] text-slate-400">
                  Display official in-game callout names on the radar
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="mapStore.showCallouts"
              class="accent-amber-500 w-4 h-4"
            />
          </label>

          <label
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Eye class="w-4 h-4 text-purple-400" />
              <div>
                <div class="text-xs font-semibold text-white">Always Show Pin Labels</div>
                <div class="text-[10px] text-slate-400">
                  Keep target names visible without hovering
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="mapStore.showLabels"
              class="accent-amber-500 w-4 h-4"
            />
          </label>

          <label
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Navigation class="w-4 h-4 text-emerald-400" />
              <div>
                <div class="text-xs font-semibold text-white">Show Live CS2 Player Marker</div>
                <div class="text-[10px] text-slate-400">
                  Render captured GSI / RCON / `getpos` player position on radar
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="cs2Store.showPlayerOnRadar"
              class="accent-amber-500 w-4 h-4"
            />
          </label>

          <label
            class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Check class="w-4 h-4 text-amber-400" />
              <div>
                <div class="text-xs font-semibold text-white">Show Curated Pro Meta Lineups</div>
                <div class="text-[10px] text-slate-400">
                  Include built-in calibrated lineups alongside custom lineups
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              v-model="lineupStore.showPresetLineups"
              class="accent-amber-500 w-4 h-4"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
