<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useThemeStore } from '../../stores/themeStore'

const themeStore = useThemeStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Star {
  x: number
  y: number
  r: number
  baseAlpha: number
  speed: number
  phase: number
  isSparkle: boolean
  tint: string
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  len: number
  alpha: number
  life: number
  maxLife: number
}

let rafId: number | null = null
let stars: Star[] = []
let shootingStars: ShootingStar[] = []
let lastTime = 0
let nextShootTime = 0
let width = 0
let height = 0

const STAR_TINTS = ['#ffffff', '#e2e8f0', '#bae6fd', '#fde68a', '#c4b5fd']

function initStars() {
  const count = Math.min(200, Math.max(110, Math.floor((width * height) / 9500)))
  stars = []
  for (let i = 0; i < count; i++) {
    const isSparkle = i % 11 === 0
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: isSparkle ? 1.4 + Math.random() * 1.1 : 0.5 + Math.random() * 1.15,
      baseAlpha: isSparkle ? 0.65 + Math.random() * 0.35 : 0.25 + Math.random() * 0.55,
      speed: 0.7 + Math.random() * 2.1,
      phase: Math.random() * Math.PI * 2,
      isSparkle,
      tint: STAR_TINTS[i % STAR_TINTS.length]!
    })
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  initStars()
}

function drawFrame(now: number) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016
  lastTime = now
  const t = now * 0.001

  ctx.clearRect(0, 0, width, height)

  if (themeStore.theme === 'light') {
    return
  }

  // Subtle deep-space cosmic nebula glow
  const g1 = ctx.createRadialGradient(width * 0.18, height * 0.15, 0, width * 0.18, height * 0.15, Math.max(width, height) * 0.55)
  g1.addColorStop(0, 'rgba(56, 189, 248, 0.08)')
  g1.addColorStop(0.5, 'rgba(99, 102, 241, 0.04)')
  g1.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, width, height)

  const g2 = ctx.createRadialGradient(width * 0.84, height * 0.78, 0, width * 0.84, height * 0.78, Math.max(width, height) * 0.5)
  g2.addColorStop(0, 'rgba(245, 158, 11, 0.065)')
  g2.addColorStop(0.55, 'rgba(127, 0, 255, 0.035)')
  g2.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, width, height)

  // Twinkling stars & 4-point shining sparkles
  for (const s of stars) {
    const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase)
    const alpha = s.baseAlpha * (0.35 + 0.65 * pulse)
    ctx.globalAlpha = alpha
    ctx.fillStyle = s.tint
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()

    if (s.isSparkle && pulse > 0.55) {
      const arm = s.r * (2.6 + pulse * 2.2)
      ctx.strokeStyle = s.tint
      ctx.lineWidth = 0.9
      ctx.globalAlpha = alpha * 0.85
      ctx.beginPath()
      ctx.moveTo(s.x - arm, s.y)
      ctx.lineTo(s.x + arm, s.y)
      ctx.moveTo(s.x, s.y - arm)
      ctx.lineTo(s.x, s.y + arm)
      ctx.stroke()
    }
  }

  // Occasional shooting star
  if (now > nextShootTime && shootingStars.length < 2) {
    nextShootTime = now + 4500 + Math.random() * 6500
    shootingStars.push({
      x: Math.random() * width * 0.8,
      y: Math.random() * height * 0.35,
      vx: 420 + Math.random() * 240,
      vy: 180 + Math.random() * 140,
      len: 75 + Math.random() * 55,
      alpha: 0.9,
      life: 0,
      maxLife: 0.75 + Math.random() * 0.35
    })
  }

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const st = shootingStars[i]!
    st.life += dt
    st.x += st.vx * dt
    st.y += st.vy * dt
    const progress = st.life / st.maxLife
    if (progress >= 1) {
      shootingStars.splice(i, 1)
      continue
    }
    const fade = Math.sin(progress * Math.PI)
    const mag = Math.hypot(st.vx, st.vy) || 1
    const tx = st.x - (st.vx / mag) * st.len
    const ty = st.y - (st.vy / mag) * st.len
    const grad = ctx.createLinearGradient(st.x, st.y, tx, ty)
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * fade})`)
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.globalAlpha = 1
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(st.x, st.y)
    ctx.lineTo(tx, ty)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  rafId = requestAnimationFrame(drawFrame)
}

function startAnimation() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) {
    drawFrame(performance.now())
    return
  }
  rafId = requestAnimationFrame(drawFrame)
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  startAnimation()
})

watch(
  () => themeStore.theme,
  () => {
    startAnimation()
  }
)

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    aria-hidden="true"
    class="fixed inset-0 w-full h-full pointer-events-none z-0"
  />
</template>
