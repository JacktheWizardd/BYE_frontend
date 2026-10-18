import { BufferAttribute, BufferGeometry, CanvasTexture, Color, PerspectiveCamera, Points, PointsMaterial, Scene, WebGLRenderer } from 'three'

// A quiet field of soft dots behind the hero: mostly warm grey, a few in the BYE yellow.
// Loaded lazily on capable desktops; pauses when the hero is off screen; never blocks content.
export function mountAmbient(host: HTMLElement) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1.2s ease'
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(50, 1, 1, 100)
  camera.position.z = 30

  const COUNT = 700
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3)
  const grey = new Color('#b9b2a6'), gold = new Color('#f2c14e')
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70
    pos[i * 3 + 1] = (Math.random() - 0.5) * 40
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    const c = Math.random() < 0.08 ? gold : grey
    col.set([c.r, c.g, c.b], i * 3)
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('color', new BufferAttribute(col, 3))

  const dot = document.createElement('canvas'); dot.width = dot.height = 32
  const g = dot.getContext('2d')!; g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill()
  const material = new PointsMaterial({ size: 0.22, vertexColors: true, map: new CanvasTexture(dot), transparent: true, opacity: 0.7, depthWrite: false })
  const points = new Points(geo, material)
  scene.add(points)

  let w = 0, h = 0
  const resize = () => {
    w = host.clientWidth; h = host.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize()

  // The cursor steers the field while it is over the hero; otherwise the field sways on its own.
  // Every dot also rises slowly and wraps around, so the background never stands still.
  let px = 0, py = 0, inside = false, mx = 0, my = 0
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    px = (e.clientX - r.left) / Math.max(1, r.width) - 0.5
    py = (e.clientY - r.top) / Math.max(1, r.height) - 0.5
  }
  const onLeave = () => { inside = false }
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)

  const speed = new Float32Array(COUNT).map(() => 0.004 + Math.random() * 0.01)
  const posAttr = geo.getAttribute('position') as BufferAttribute
  let raf = 0, running = false, last = performance.now()
  const t0 = last
  const frame = () => {
    const now = performance.now(), t = (now - t0) / 1000, dt = Math.min(3, (now - last) / 16.7)
    last = now
    // Autopilot: a slow figure-eight when the cursor is elsewhere.
    const tx = inside ? px : Math.sin(t * 0.25) * 0.45, ty = inside ? py : Math.sin(t * 0.18) * Math.cos(t * 0.11) * 0.35
    mx += (tx - mx) * 0.03 * dt; my += (ty - my) * 0.03 * dt
    for (let i = 0; i < COUNT; i++) {
      let y = pos[i * 3 + 1] + speed[i] * dt
      if (y > 20) y = -20
      pos[i * 3 + 1] = y
      pos[i * 3] += Math.sin(t * 0.5 + i) * 0.002 * dt
    }
    posAttr.needsUpdate = true
    points.rotation.y = t * 0.015 + mx * 0.22
    points.rotation.x = my * 0.14
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; frame() }
    else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf) }
  })
  io.observe(host)
  requestAnimationFrame(() => { renderer.domElement.style.opacity = '1' })

  return () => {
    cancelAnimationFrame(raf); io.disconnect(); ro.disconnect()
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    geo.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove()
  }
}
