import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import PipPoster from "./PipPoster"
import { createPipScene, preloadPipModels } from "./pipAssets"

export default function PipAvatar({ wave = false, onReady }: { wave?: boolean; onReady?: () => void }) {
  const mount = useRef<HTMLDivElement>(null)
  const waving = useRef(wave)
  const readyCallback = useRef(onReady)
  waving.current = wave
  readyCallback.current = onReady
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = mount.current
    if (!host) return
    let disposed = false
    let frame = 0
    let revealTimer = 0
    let cleanup = () => {}
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    void preloadPipModels().then((loaded) => {
      if (disposed) return
      let renderer: THREE.WebGLRenderer
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) }
      catch { readyCallback.current?.(); return }
      const { scene, carrier, camera, rest, waveModel, mixer, action, fit } = createPipScene(loaded)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.7
      host.appendChild(renderer.domElement)
      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        fit(width, height)
        renderer.setSize(width, height, false)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      // Reveal after the first real frame and hold the neutral pose during the fade.
      renderer.render(scene, camera)
      setReady(true)
      let revealed = false
      revealTimer = window.setTimeout(() => {
        revealed = true
        readyCallback.current?.()
      }, parseFloat(getComputedStyle(renderer.domElement).transitionDuration) * 1000 || 0)
      const clock = new THREE.Clock()
      let elapsed = 0
      let lastWave = false
      const render = () => {
        frame = requestAnimationFrame(render)
        const delta = Math.min(clock.getDelta(), 0.05)
        if (revealed) elapsed += delta
        const shouldWave = revealed && waving.current && !motion.matches && Boolean(action)
        if (shouldWave !== lastWave && waveModel) {
          rest.visible = !shouldWave
          waveModel.visible = shouldWave
          if (shouldWave) action?.reset().play()
          else action?.stop()
          lastWave = shouldWave
        }
        if (revealed && !motion.matches) {
          mixer?.update(delta)
          carrier.rotation.y = Math.sin(elapsed * 0.7) * 0.1
          carrier.position.y = Math.sin(elapsed * 1.6) * 0.045
        } else { carrier.rotation.y = 0; carrier.position.y = 0 }
        renderer.render(scene, camera)
      }
      render()
      cleanup = () => {
        cancelAnimationFrame(frame)
        clearTimeout(revealTimer)
        observer.disconnect()
        mixer?.stopAllAction()
        if (waveModel) mixer?.uncacheRoot(waveModel)
        renderer.dispose()
        renderer.domElement.remove()
      }
    }).catch(() => { if (!disposed) readyCallback.current?.() })
    return () => { disposed = true; cleanup() }
  }, [])

  return (
    <div className={`pip-avatar ${ready ? "is-ready" : ""}`} ref={mount} role="img" aria-label="Pip, your floating learning guide">
      <PipPoster />
    </div>
  )
}
