// End-to-End & Symmetric Message Encryption using Web Crypto API (AES-GCM)

async function getDerivedKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const rawKey = enc.encode(secret.padEnd(32, '0').slice(0, 32))
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function generateConversationSecret(userA: string, userB: string): string {
  const sorted = [userA.toLowerCase(), userB.toLowerCase()].sort().join('::')
  return `protutech-e2ee-key-${sorted}`
}

export async function encryptMessage(text: string, secret: string): Promise<string> {
  try {
    if (!text) return ''
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return `ENC:PLAIN:${btoa(encodeURIComponent(text))}`
    }

    const key = await getDerivedKey(secret)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const encoded = enc.encode(text)

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    )

    const ivB64 = bufferToBase64(iv.buffer)
    const dataB64 = bufferToBase64(encrypted)
    return `ENC:${ivB64}:${dataB64}`
  } catch (e) {
    console.error('Encryption error:', e)
    return text
  }
}

export async function decryptMessage(cipher: string, secret: string): Promise<string> {
  try {
    if (!cipher) return ''
    if (!cipher.startsWith('ENC:')) {
      return cipher // Legacy unencrypted message
    }

    const parts = cipher.split(':')
    if (parts[1] === 'PLAIN' && parts[2]) {
      return decodeURIComponent(atob(parts[2]))
    }

    if (parts.length < 3) return cipher
    const ivB64 = parts[1]
    const dataB64 = parts[2]

    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return '[Encrypted Message]'
    }

    const key = await getDerivedKey(secret)
    const iv = new Uint8Array(base64ToBuffer(ivB64))
    const data = base64ToBuffer(dataB64)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    const dec = new TextDecoder()
    return dec.decode(decrypted)
  } catch (e) {
    return cipher.startsWith('ENC:') ? '[Encrypted Message]' : cipher
  }
}
