export function parseViewBox(viewBox = '0 0 1000 1000') {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number)
  return {
    minX: parts[0] || 0,
    minY: parts[1] || 0,
    width: parts[2] || 1000,
    height: parts[3] || 1000
  }
}

export function pctToSvg(
  coords: { x: number; y: number },
  viewBox = '0 0 1000 1000'
) {
  const vb = parseViewBox(viewBox)
  return {
    x: vb.minX + (coords.x / 100) * vb.width,
    y: vb.minY + (coords.y / 100) * vb.height
  }
}

export function clientToPct(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const mapped = pt.matrixTransform(ctm.inverse())
  const vb = svg.viewBox.baseVal.width
    ? svg.viewBox.baseVal
    : { x: 0, y: 0, width: 1000, height: 1000 }

  const x = ((mapped.x - vb.x) / vb.width) * 100
  const y = ((mapped.y - vb.y) / vb.height) * 100

  return {
    x: Math.round(Math.min(Math.max(x, 3), 97) * 10) / 10,
    y: Math.round(Math.min(Math.max(y, 3), 97) * 10) / 10
  }
}

export function trajectoryPath(
  origin: { x: number; y: number },
  landing: { x: number; y: number },
  viewBox = '0 0 1000 1000',
  curveOffset = 0
): string {
  const o = pctToSvg(origin, viewBox)
  const l = pctToSvg(landing, viewBox)
  const mx = (o.x + l.x) / 2
  const my = (o.y + l.y) / 2
  const dx = l.x - o.x
  const dy = l.y - o.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const vb = parseViewBox(viewBox)
  const scale = vb.height / 1000
  const archHeight = Math.min(Math.max(dist * 0.25, 20 * scale), 80 * scale) + curveOffset * 2 * scale
  const cx = mx + (-dy / dist) * archHeight
  const cy = my + (dx / dist) * archHeight
  return `M ${o.x} ${o.y} Q ${cx} ${cy} ${l.x} ${l.y}`
}
