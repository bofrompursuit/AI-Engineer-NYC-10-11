import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import PeachesPoster from "./PeachesPoster"
import { createPeachesScene, preloadPeachesModels } from "./peachesAssets"
import { createPeachesMotion } from "./peachesMotion"
import type { PeachesMood } from "./peachesBehavior"

const waveFade = 0.3
const silence = () => 0

export default function PeachesAvatar({ wave = false, mood = "idle", reactionSerial = 0, getLevel = silence, onReady }: {
  wave?: boolean
  mood?: PeachesMood
  reactionSerial?: number
  getLevel?: () => number
  onReady?: () => void
}) {
  const mount = useRef<HTMLDivElement>(null)
  const waving = useRef(wave)
  const behavior = useRef({ mood, getLevel, reactionSerial })
  const readyCallback = useRef(onReady)
  waving.current = wave
  behavior.current = { mood, getLevel, reactionSerial }
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
    void preloadPeachesModels().then((loaded) => {
      if (disposed) return
      let renderer: THREE.WebGLRenderer
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) }
      catch { readyCallback.current?.(); return }
      const { scene, camera, rest, mixer, action, fit } = createPeachesScene(loaded)
      const movement = createPeachesMotion(rest)
      if (action) { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true }
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
      let waveEnds = 0
      const finishWave = () => {
        action?.fadeOut(waveFade)
        waveEnds = elapsed + waveFade
      }
      mixer?.addEventListener("finished", finishWave)
      const render = () => {
        frame = requestAnimationFrame(render)
        const delta = Math.min(clock.getDelta(), 0.05)
        if (document.hidden) return
        if (revealed) elapsed += delta
        const shouldWave = revealed && waving.current && !motion.matches && Boolean(action)
        if (shouldWave !== lastWave) {
          if (shouldWave) { waveEnds = 0; action?.reset().fadeIn(waveFade).play() }
          else finishWave()
          lastWave = shouldWave
        }
        if (motion.matches) { action?.stop(); waveEnds = 0 }
        else if (waveEnds && elapsed >= waveEnds) { action?.stop(); waveEnds = 0 }
        if (revealed && !motion.matches) {
          mixer?.update(delta)
        }
        if (revealed) {
          const activeWave = Boolean(action?.enabled && (action.isRunning() || action.paused))
          const { mood: currentMood, getLevel: currentLevel, reactionSerial: sequence } = behavior.current
          movement.update(elapsed, delta, currentMood, currentLevel(), activeWave, motion.matches, sequence)
        }
        renderer.render(scene, camera)
      }
      render()
      cleanup = () => {
        cancelAnimationFrame(frame)
        clearTimeout(revealTimer)
        observer.disconnect()
        mixer?.removeEventListener("finished", finishWave)
        mixer?.stopAllAction()
        mixer?.uncacheRoot(rest)
        renderer.dispose()
        renderer.domElement.remove()
      }
    }).catch(() => { if (!disposed) readyCallback.current?.() })
    return () => { disposed = true; cleanup() }
  }, [])

  return (
    <div className={`peaches-avatar ${ready ? "is-ready" : ""}`} data-peaches-mood={mood} ref={mount} role="img" aria-label="Peaches, your floating learning guide">
      <PeachesPoster />
    </div>
  )
}
