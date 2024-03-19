let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null

self.onmessage = ev => {
  if (ev.data.canvas) {
    canvas = ev.data.canvas
    ctx = canvas!.getContext('2d')
    requestAnimationFrame(draw)
  }
}

const draw = () => {
  if (!canvas || !ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = 'green'
  ctx.fillRect(0, 0, w, h)
}
