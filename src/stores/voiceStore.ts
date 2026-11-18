import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useLineupStore } from './lineupStore'
import { useThemeStore } from './themeStore'
import { useCS2ServerStore } from './cs2ServerStore'
import { MAPS_DATA } from '../data/mapsData'
import type { GrenadeType } from '../types'

export interface VoiceCommandHistoryItem {
  id: string
  transcript: string
  actionTaken: string
  matchedLineupId?: string
  timestamp: string
}

export const useVoiceStore = defineStore('voice', () => {
  const isSupported = ref<boolean>(
    typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
  const isListening = ref<boolean>(false)
  const handsFreeMode = ref<boolean>(false)
  const audioFeedback = ref<boolean>(true)
  const isPanelOpen = ref<boolean>(false)

  const liveTranscript = ref<string>('')
  const lastActionSummary = ref<string>('Say "Mirage Window Smoke" or "Next step"')
  const errorMessage = ref<string | null>(null)
  const history = ref<VoiceCommandHistoryItem[]>([])

  let recognition: any = null

  function speakFeedback(text: string) {
    if (!audioFeedback.value || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return
    }
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.1
      utterance.pitch = 1.0
      utterance.volume = 0.85
      window.speechSynthesis.speak(utterance)
    } catch {
      // Ignore TTS errors on restricted browsers
    }
  }

  function recordAction(transcript: string, actionTaken: string, matchedLineupId?: string) {
    lastActionSummary.value = actionTaken
    history.value.unshift({
      id: `vc-${Date.now()}`,
      transcript,
      actionTaken,
      matchedLineupId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    })
    if (history.value.length > 15) {
      history.value.pop()
    }
    speakFeedback(actionTaken)
  }

  /**
   * Core Natural Language & Keyword Voice Command Processor
   */
  function processVoiceCommand(rawText: string): {
    action: string
    matchedLineupId?: string
  } {
    const lineupStore = useLineupStore()
    const themeStore = useThemeStore()
    const cs2Store = useCS2ServerStore()

    const clean = rawText.trim().toLowerCase()
    if (!clean) return { action: 'Empty command' }

    // 1. Modal / Step-by-Step Navigation Commands (Hands-Free Mobile & Desktop)
    if (lineupStore.selectedLineup) {
      if (
        clean === 'next' ||
        clean.includes('next step') ||
        clean.includes('step forward')
      ) {
        lineupStore.nextInstructionStep()
        const stepNum = lineupStore.activeInstructionStepIndex + 1
        const msg = `Step ${stepNum} of ${lineupStore.selectedLineup.title}`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (
        clean === 'previous' ||
        clean === 'back' ||
        clean.includes('previous step') ||
        clean.includes('step back')
      ) {
        lineupStore.prevInstructionStep()
        const stepNum = lineupStore.activeInstructionStepIndex + 1
        const msg = `Step ${stepNum} of ${lineupStore.selectedLineup.title}`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('step 1') || clean.includes('step one') || clean.includes('standing')) {
        lineupStore.activeInstructionFormat = 'steps'
        lineupStore.activeInstructionStepIndex = 0
        const msg = `Showing Step 1 (Position)`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('step 2') || clean.includes('step two') || clean.includes('aim point')) {
        lineupStore.activeInstructionFormat = 'steps'
        lineupStore.activeInstructionStepIndex = 1
        const msg = `Showing Step 2 (Aim Point)`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('step 3') || clean.includes('step three') || clean.includes('throw')) {
        lineupStore.activeInstructionFormat = 'steps'
        lineupStore.activeInstructionStepIndex = 2
        const msg = `Showing Step 3 (Throw Execution)`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('show video') || clean.includes('play video') || clean === 'video') {
        lineupStore.activeInstructionFormat = 'video'
        const msg = `Switched to Video Instructions`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('show images') || clean.includes('photos') || clean === 'images') {
        lineupStore.activeInstructionFormat = 'images'
        const msg = `Switched to Individual Images`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('copy command') || clean.includes('copy setpos')) {
        if (lineupStore.selectedLineup.consoleCommand && navigator.clipboard) {
          navigator.clipboard.writeText(lineupStore.selectedLineup.consoleCommand).catch(() => {})
        }
        const msg = `Copied setpos command to clipboard`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean.includes('teleport') || clean.includes('send to cs2')) {
        cs2Store.pushLineupToGame(lineupStore.selectedLineup)
        const msg = `Sent ${lineupStore.selectedLineup.title} to CS2 practice server`
        recordAction(rawText, msg, lineupStore.selectedLineup.id)
        return { action: msg, matchedLineupId: lineupStore.selectedLineup.id }
      }

      if (clean === 'close' || clean === 'exit' || clean.includes('close lineup')) {
        lineupStore.selectLineup(null)
        const msg = `Closed lineup viewer`
        recordAction(rawText, msg)
        return { action: msg }
      }
    }

    // 2. Layout Mode Switching
    if (clean.includes('mobile mode') || clean.includes('phone mode')) {
      themeStore.setLayoutMode('mobile')
      const msg = 'Switched to Mobile Layout Mode'
      recordAction(rawText, msg)
      return { action: msg }
    }
    if (clean.includes('desktop mode')) {
      themeStore.setLayoutMode('desktop')
      const msg = 'Switched to Desktop Layout Mode'
      recordAction(rawText, msg)
      return { action: msg }
    }

    // 3. Reset / Clear Filters
    if (
      clean === 'reset' ||
      clean === 'clear' ||
      clean.includes('reset filters') ||
      clean.includes('show all')
    ) {
      lineupStore.resetFilters()
      lineupStore.selectLineup(null)
      const msg = 'Reset all radar filters'
      recordAction(rawText, msg)
      return { action: msg }
    }

    // 4. Floor Switching (Nuke / Vertigo)
    if (clean.includes('lower floor') || clean.includes('lower radar') || clean === 'lower') {
      lineupStore.activeFloorId = 'lower'
      const msg = 'Switched radar to Lower Floor'
      recordAction(rawText, msg)
      return { action: msg }
    }
    if (clean.includes('upper floor') || clean.includes('upper radar') || clean === 'upper') {
      lineupStore.activeFloorId = 'upper'
      const msg = 'Switched radar to Upper Floor'
      recordAction(rawText, msg)
      return { action: msg }
    }

    // 5. Detect Map in Command
    let detectedMapId: string | null = null
    for (const m of MAPS_DATA) {
      if (
        clean.includes(m.id) ||
        clean.includes(m.name.toLowerCase()) ||
        clean.includes(m.code.toLowerCase())
      ) {
        detectedMapId = m.id
        break
      }
    }
    if (clean.includes('dust 2') || clean.includes('dust two') || clean.includes('d2')) {
      detectedMapId = 'dust2'
    }
    if (
      clean.includes('cobblestone') ||
      clean.includes('cobble') ||
      clean.includes('cbble') ||
      clean.includes('de_cbble')
    ) {
      detectedMapId = 'cobblestone'
    }

    if (detectedMapId && detectedMapId !== lineupStore.activeMapId) {
      lineupStore.activeMapId = detectedMapId
      lineupStore.activeFloorId = 'upper'
      lineupStore.activeExecuteId = null
    }

    // 6. Check if User Requested a Team Execute
    if (clean.includes('execute') || clean.includes('strat')) {
      const targetMap = detectedMapId || lineupStore.activeMapId
      const mapExecs = lineupStore.executes.filter((e) => e.mapId === targetMap)
      const matchedExec =
        mapExecs.find((e) => {
          if (clean.includes('mid') && e.site === 'Mid') return true
          if (/\bb\b/.test(clean) && e.site === 'B') return true
          if (/\ba\b/.test(clean) && e.site === 'A') return true
          return clean
            .split(/\s+/)
            .some((w) => w.length > 3 && e.title.toLowerCase().includes(w))
        }) || mapExecs[0]

      if (matchedExec) {
        lineupStore.activeExecuteId = matchedExec.id
        const msg = `Activated Team Execute: ${matchedExec.title}`
        recordAction(rawText, msg)
        return { action: msg }
      }
    }

    // 7. Detect Grenade Type
    let detectedGrenade: GrenadeType | null = null
    if (clean.includes('smoke')) detectedGrenade = 'smoke'
    else if (clean.includes('flash') || clean.includes('popflash')) detectedGrenade = 'flash'
    else if (clean.includes('molly') || clean.includes('molotov') || clean.includes('incendiary'))
      detectedGrenade = 'molotov'
    else if (clean.includes('he ') || clean.includes('he grenade') || clean.includes('nade'))
      detectedGrenade = 'he'

    // 8. Score Lineups on the Target Map to find a specific Lineup Match
    const targetMapId = detectedMapId || lineupStore.activeMapId
    const mapLineups = lineupStore.allLineups.filter((l) => l.mapId === targetMapId)

    const stopWords = new Set([
      'show',
      'find',
      'open',
      'lineup',
      'grenade',
      'smoke',
      'flash',
      'molotov',
      'molly',
      'on',
      'in',
      'to',
      'from',
      'the',
      'for',
      'map',
      targetMapId,
      'dust',
      'two',
      'cobblestone',
      'cobble',
      'cbble',
      'de_cbble'
    ])
    const queryTokens = clean
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t))

    if (queryTokens.length > 0) {
      let bestLineup = null
      let bestScore = 0

      for (const item of mapLineups) {
        if (detectedGrenade && item.grenadeType !== detectedGrenade) continue
        let score = 0
        const haystack =
          `${item.title} ${item.startLocation} ${item.endLocation} ${item.tags.join(' ')} ${item.site || ''}`.toLowerCase()

        for (const token of queryTokens) {
          if (item.endLocation.toLowerCase().includes(token)) score += 5
          else if (item.title.toLowerCase().includes(token)) score += 4
          else if (haystack.includes(token)) score += 2
        }

        if (score > bestScore) {
          bestScore = score
          bestLineup = item
        }
      }

      if (bestLineup && bestScore >= 2) {
        if (detectedGrenade) {
          lineupStore.setSingleGrenadeType('all')
        }
        lineupStore.selectLineup(bestLineup)
        const msg = `Opened ${bestLineup.title} (${bestLineup.endLocation})`
        recordAction(rawText, msg, bestLineup.id)
        return { action: msg, matchedLineupId: bestLineup.id }
      }
    }

    // 9. If only map or grenade filter was spoken
    if (detectedGrenade) {
      lineupStore.setSingleGrenadeType(detectedGrenade)
      const mapLabel = MAPS_DATA.find((m) => m.id === targetMapId)?.name || targetMapId
      const msg = `Filtered ${mapLabel} to ${detectedGrenade.toUpperCase()} lineups`
      recordAction(rawText, msg)
      return { action: msg }
    }

    if (detectedMapId) {
      const mapLabel = MAPS_DATA.find((m) => m.id === detectedMapId)?.name || detectedMapId
      const msg = `Switched map to ${mapLabel}`
      recordAction(rawText, msg)
      return { action: msg }
    }

    // 10. Fallback: set search query
    lineupStore.searchQuery = rawText.trim()
    const msg = `Searching lineups for "${rawText.trim()}"`
    recordAction(rawText, msg)
    return { action: msg }
  }

  function startListening(continuousHandsFree = false) {
    if (!isSupported.value) {
      errorMessage.value =
        'Web Speech API is not supported in this browser. Use the command input below or Chrome/Edge/Safari.'
      return
    }

    errorMessage.value = null
    if (continuousHandsFree) {
      handsFreeMode.value = true
    }

    if (isListening.value && recognition) {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
      isListening.value = false
      handsFreeMode.value = false
      return
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.continuous = handsFreeMode.value
    recognition.interimResults = true

    recognition.onstart = () => {
      isListening.value = true
      liveTranscript.value = 'Listening...'
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) {
          finalTranscript += res[0].transcript
        } else {
          interim += res[0].transcript
        }
      }

      if (interim) {
        liveTranscript.value = interim
      }
      if (finalTranscript.trim()) {
        liveTranscript.value = finalTranscript.trim()
        processVoiceCommand(finalTranscript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        errorMessage.value = `Voice error: ${event.error}`
      }
      if (!handsFreeMode.value) {
        isListening.value = false
      }
    }

    recognition.onend = () => {
      if (handsFreeMode.value) {
        try {
          recognition.start()
        } catch {
          isListening.value = false
        }
      } else {
        isListening.value = false
      }
    }

    try {
      recognition.start()
    } catch (e: any) {
      errorMessage.value = e?.message || 'Could not start microphone'
      isListening.value = false
    }
  }

  function stopListening() {
    handsFreeMode.value = false
    isListening.value = false
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        // ignore
      }
    }
  }

  function toggleHandsFreeMode() {
    if (handsFreeMode.value) {
      stopListening()
    } else {
      handsFreeMode.value = true
      startListening(true)
    }
  }

  function toggleListening() {
    if (isListening.value) {
      stopListening()
    } else {
      startListening(handsFreeMode.value)
    }
  }

  return {
    isSupported,
    isListening,
    handsFreeMode,
    audioFeedback,
    isPanelOpen,
    liveTranscript,
    lastActionSummary,
    errorMessage,
    history,
    processVoiceCommand,
    startListening,
    stopListening,
    toggleListening,
    toggleHandsFreeMode
  }
})
