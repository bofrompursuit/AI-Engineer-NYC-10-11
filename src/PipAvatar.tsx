import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

export default function PipAvatar({ wave = false }: { wave?: boolean }) {
  const mount = useRef<HTMLDivElement>(null)
  const waving = useRef(wave)
  waving.current = wave
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = mount.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      return
    }
    let disposed = false
    let frame = 0
    let rest: THREE.Group | undefined
    let waveModel: THREE.Group | undefined
    let mixer: THREE.AnimationMixer | undefined
    let action: THREE.AnimationAction | undefined
    let lastWave = false
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const scene = new THREE.Scene()
    const carrier = new THREE.Group()
    scene.add(carrier)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.7
    host.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9af71, 3))
    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(-3, 5, 7)
    scene.add(light)
    const rim = new THREE.DirectionalLight(0xffe655, 3)
    rim.position.set(4, 2, -3)
    scene.add(rim)
    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.position.set(0, 0, 6.4 / Math.min(camera.aspect, 1))
      camera.lookAt(0, 0, 0)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const disposeModel = (model: THREE.Object3D) =>
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material]
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose()
          })
          material.dispose()
        })
      })
    const loader = new GLTFLoader()
    Promise.allSettled([
      loader.loadAsync("/models/pip-neutral.glb"),
      loader.loadAsync("/models/pip-hover-wave.glb"),
    ]).then(([neutral, animated]) => {
      if (neutral.status !== "fulfilled") {
        if (animated.status === "fulfilled") disposeModel(animated.value.scene)
        return
      }
      if (disposed) {
        disposeModel(neutral.value.scene)
        if (animated.status === "fulfilled") disposeModel(animated.value.scene)
        return
      }
      rest = neutral.value.scene
      const bounds = new THREE.Box3().setFromObject(rest)
      const center = bounds.getCenter(new THREE.Vector3())
      const size = bounds.getSize(new THREE.Vector3())
      carrier.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z))
      rest.position.copy(center).negate()
      carrier.add(rest)
      if (animated.status === "fulfilled") {
        waveModel = animated.value.scene
        waveModel.position.copy(center).negate()
        waveModel.visible = false
        carrier.add(waveModel)
        if (animated.value.animations.length) {
          mixer = new THREE.AnimationMixer(waveModel)
          action = mixer.clipAction(animated.value.animations[0])
        }
      }
      setReady(true)
    })
    const clock = new THREE.Clock()
    let elapsed = 0
    const render = () => {
      frame = requestAnimationFrame(render)
      const delta = Math.min(clock.getDelta(), 0.05)
      elapsed += delta
      const shouldWave = waving.current && !motion.matches && Boolean(action)
      if (shouldWave !== lastWave && rest && waveModel) {
        rest.visible = !shouldWave
        waveModel.visible = shouldWave
        if (shouldWave) action?.reset().play()
        else action?.stop()
        lastWave = shouldWave
      }
      if (!motion.matches) {
        mixer?.update(delta)
        carrier.rotation.y = Math.sin(elapsed * 0.7) * 0.1
        carrier.position.y = Math.sin(elapsed * 1.6) * 0.045
      } else {
        carrier.rotation.y = 0
        carrier.position.y = 0
      }
      renderer.render(scene, camera)
    }
    render()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      mixer?.stopAllAction()
      disposeModel(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      className={`pip-avatar ${ready ? "is-ready" : ""}`}
      ref={mount}
      role="img"
      aria-label="Pip, your floating learning guide"
    >
      {!ready && (
        <svg className="pip-fallback" viewBox="0 0 160 180" aria-hidden="true">
          <ellipse cx="80" cy="165" rx="34" ry="6" fill="#f5a524" />
          <rect x="30" y="20" width="100" height="125" rx="44" fill="#262727" />
          <rect x="40" y="30" width="80" height="65" rx="25" fill="#fff6df" />
          <circle cx="63" cy="57" r="5" fill="#262727" />
          <circle cx="97" cy="57" r="5" fill="#262727" />
          <path d="M73 72h14a7 7 0 0 1-14 0" fill="#262727" />
          <path d="m68 109 23-7-3 10-23 7m7 3 23-7-3 10-23 7" fill="#ffe833" />
          <ellipse cx="24" cy="94" rx="14" ry="24" fill="#262727" />
          <ellipse cx="136" cy="94" rx="14" ry="24" fill="#262727" />
        </svg>
      )}
    </div>
  )
}
