/**
 * CS2 Screen Capture & Clipboard Utilities
 * Allows 1-click snapshot directly from the CS2 Game Window or browser screen capture API,
 * as well as clipboard image extraction and compression.
 */

export interface CapturedFrame {
  dataUrl: string
  width: number
  height: number
  timestamp: number
}

/**
 * Capture a single high-res frame from the screen or CS2 game window using Browser Screen Capture API
 */
export async function captureScreenFrame(): Promise<CapturedFrame | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen capture is not supported by your browser or environment.')
  }

  let mediaStream: MediaStream | null = null
  try {
    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'window',
        frameRate: { ideal: 30, max: 60 }
      },
      audio: false
    })

    const videoTrack = mediaStream.getVideoTracks()[0]
    if (!videoTrack) {
      throw new Error('No video track received from screen capture.')
    }

    const video = document.createElement('video')
    video.srcObject = mediaStream
    video.muted = true
    video.playsInline = true

    // Wait for video to load metadata and play
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = async () => {
        try {
          await video.play()
          resolve()
        } catch (e) {
          reject(e)
        }
      }
      video.onerror = (e) => reject(e)
    })

    // Allow a short tick for frame to render
    await new Promise((r) => setTimeout(r, 120))

    const width = video.videoWidth || 1920
    const height = video.videoHeight || 1080

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Could not initialize canvas context for snapshot.')
    }

    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

    // Stop all tracks immediately
    mediaStream.getTracks().forEach((track) => track.stop())

    return {
      dataUrl,
      width,
      height,
      timestamp: Date.now()
    }
  } catch (err: any) {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
    }
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      // User cancelled screen picker
      return null
    }
    throw err
  }
}

/**
 * Extract image data URL from clipboard event
 */
export async function extractImageFromClipboard(event?: ClipboardEvent): Promise<string | null> {
  if (event && event.clipboardData) {
    const items = event.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (file) {
          return await fileToDataUrl(file)
        }
      }
    }
  }

  // Fallback to Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.read) {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            return await blobToDataUrl(blob)
          }
        }
      }
    } catch (e) {
      // Clipboard read permission might not be granted
    }
  }

  return null
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(blob)
  })
}
