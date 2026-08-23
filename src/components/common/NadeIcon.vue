<script setup lang="ts">
import { computed } from 'vue'
import type { GrenadeType } from '../../types'

const props = withDefaults(
  defineProps<{
    type: GrenadeType
    size?: number | string
    className?: string
    filled?: boolean
  }>(),
  {
    size: 20,
    filled: false,
    className: ''
  }
)

const colorClass = computed(() => {
  switch (props.type) {
    case 'smoke':
      return 'text-slate-300'
    case 'flash':
      return 'text-amber-400'
    case 'molotov':
      return 'text-orange-500'
    case 'he':
      return 'text-emerald-400'
    case 'decoy':
      return 'text-purple-400'
    default:
      return 'text-slate-400'
  }
})
</script>

<template>
  <div :class="['inline-flex items-center justify-center flex-shrink-0', colorClass, className]">
    <!-- SMOKE ICON -->
    <svg 
      v-if="type === 'smoke'" 
      :width="size" 
      :height="size" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" :fill="filled ? 'currentColor' : 'none'" :fill-opacity="filled ? '0.2' : '0'" />
      <path d="M7 19v2" />
      <path d="M12 19v2" />
      <path d="M17 19v2" />
    </svg>

    <!-- FLASHBANG ICON -->
    <svg 
      v-else-if="type === 'flash'" 
      :width="size" 
      :height="size" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" :fill="filled ? 'currentColor' : 'none'" :fill-opacity="filled ? '0.25' : '0'" />
    </svg>

    <!-- MOLOTOV / INCENDIARY ICON -->
    <svg 
      v-else-if="type === 'molotov'" 
      :width="size" 
      :height="size" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" :fill="filled ? 'currentColor' : 'none'" :fill-opacity="filled ? '0.25' : '0'" />
    </svg>

    <!-- HE GRENADE ICON -->
    <svg 
      v-else-if="type === 'he'" 
      :width="size" 
      :height="size" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <circle cx="12" cy="14" r="7" :fill="filled ? 'currentColor' : 'none'" :fill-opacity="filled ? '0.2' : '0'" />
      <path d="M12 7V3" />
      <path d="M9 3h6" />
      <path d="M15 5l2-2" />
      <circle cx="12" cy="14" r="3" />
    </svg>

    <!-- DECOY ICON -->
    <svg 
      v-else-if="type === 'decoy'" 
      :width="size" 
      :height="size" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" :fill="filled ? 'currentColor' : 'none'" :fill-opacity="filled ? '0.2' : '0'" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  </div>
</template>
