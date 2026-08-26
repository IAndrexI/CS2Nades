import { ref } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDestructive?: boolean
}

const isOpen = ref(false)
const dialogOptions = ref<ConfirmOptions>({
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  isDestructive: false
})
let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  function confirmAction(options: ConfirmOptions): Promise<boolean> {
    dialogOptions.value = {
      title: options.title || 'Confirmation',
      message: options.message,
      confirmLabel: options.confirmLabel || 'Confirm',
      cancelLabel: options.cancelLabel || 'Cancel',
      isDestructive: options.isDestructive ?? true
    }
    isOpen.value = true

    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    if (resolvePromise) resolvePromise(true)
    resolvePromise = null
  }

  function handleCancel() {
    isOpen.value = false
    if (resolvePromise) resolvePromise(false)
    resolvePromise = null
  }

  return {
    isOpen,
    dialogOptions,
    confirmAction,
    handleConfirm,
    handleCancel
  }
}
