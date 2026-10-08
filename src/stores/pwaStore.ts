import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePwaStore = defineStore('pwa', () => {
  const deferredPrompt = ref<any>(null)
  const isInstalled = ref(false)
  const isStandaloneMode = ref(false)
  const installOutcome = ref<'accepted' | 'dismissed' | null>(null)

  // Initialize display mode detection
  if (typeof window !== 'undefined') {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true
    isStandaloneMode.value = isStandalone
    if (isStandalone) {
      isInstalled.value = true
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault()
      deferredPrompt.value = e
    })

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      deferredPrompt.value = null
      console.log('CS2 Stratbook App installed successfully.')
    })
  }

  const isInstallable = computed(() => {
    return !!deferredPrompt.value && !isStandaloneMode.value
  })

  const currentOrigin = computed(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:8080'
  })

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt.value) {
      return false
    }

    try {
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      installOutcome.value = outcome
      if (outcome === 'accepted') {
        isInstalled.value = true
        deferredPrompt.value = null
        return true
      }
      return false
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err)
      return false
    }
  }

  function downloadWindowsAppLauncher() {
    const origin = currentOrigin.value
    const batScript = `@echo off
title Launching CS2 Tactical Stratbook App...
echo ===================================================
echo  PROTUTECH CS2 TACTICAL STRATBOOK DESKTOP APP
echo  Connected to: ${origin}
echo  All lineups, maps, and tactics sync 100%% live!
echo ===================================================

:: Try launching in Microsoft Edge App Mode (Clean borderless desktop window)
start "" "msedge.exe" --app="${origin}" 2>nul
if %ERRORLEVEL% EQU 0 goto done

:: Try Google Chrome App Mode
start "" "chrome.exe" --app="${origin}" 2>nul
if %ERRORLEVEL% EQU 0 goto done

:: Fallback to default system web browser
start "" "${origin}"

:done
exit
`
    const blob = new Blob([batScript], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Launch_CS2_Stratbook.bat'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadWindowsShortcut() {
    const origin = currentOrigin.value
    const urlContent = `[InternetShortcut]
URL=${origin}
IconIndex=0
IconFile=${origin}/favicon.ico
HotKey=0
IDList=
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,0
`
    const blob = new Blob([urlContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CS2_Tactical_Stratbook.url'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    deferredPrompt,
    isInstalled,
    isStandaloneMode,
    isInstallable,
    installOutcome,
    currentOrigin,
    promptInstall,
    downloadWindowsAppLauncher,
    downloadWindowsShortcut
  }
})
