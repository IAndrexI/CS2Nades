<script setup lang="ts">
import { useConfirmDialog } from '../../composables/useConfirmDialog'
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-vue-next'

const { isOpen, dialogOptions, handleConfirm, handleCancel } = useConfirmDialog()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 flex items-center justify-center animate-fade-in select-none"
      @click.self="handleCancel"
    >
      <div class="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center items-center">
        <div
          :class="[
            'p-3.5 rounded-2xl border shadow-inner',
            dialogOptions.isDestructive
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          ]"
        >
          <Trash2 v-if="dialogOptions.isDestructive" class="w-7 h-7 stroke-[2.5]" />
          <HelpCircle v-else class="w-7 h-7 stroke-[2.5]" />
        </div>

        <div>
          <h3 class="text-base font-black uppercase text-white tracking-wide">
            {{ dialogOptions.title }}
          </h3>
          <p class="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
            {{ dialogOptions.message }}
          </p>
        </div>

        <div class="flex items-center gap-3 w-full pt-2">
          <button
            @click="handleCancel"
            class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {{ dialogOptions.cancelLabel }}
          </button>
          <button
            @click="handleConfirm"
            :class="[
              'flex-1 py-2.5 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer hover:scale-[1.02]',
              dialogOptions.isDestructive
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black'
            ]"
          >
            {{ dialogOptions.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
