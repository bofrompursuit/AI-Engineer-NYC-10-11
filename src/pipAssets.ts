import * as THREE from "three"
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js"
import { clone } from "three/addons/utils/SkeletonUtils.js"

type PipAssets = { neutral: GLTF; animated: GLTF | null }
let assets: Promise<PipAssets> | undefined

// The cache owns shared geometry/materials for the page's lifetime.
export function preloadPipModels() {
  if (!assets) {
    const loader = new GLTFLoader()
    assets = Promise.allSettled([
      loader.loadAsync("/models/pip-neutral-expressions.glb"),
      loader.loadAsync("/models/pip-hover-wave-expressions.glb"),
    ]).then(([neutral, animated]) => {
      if (neutral.status !== "fulfilled") {
        assets = undefined
        throw neutral.reason
      }
      return { neutral: neutral.value, animated: animated.status === "fulfilled" ? animated.value : null }
    })
  }
  return assets
}

// Shared by the live avatar and its matching still render.
export function createPipScene(loaded: PipAssets) {
  const scene = new THREE.Scene()
  const carrier = new THREE.Group()
  scene.add(carrier)
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9af71, 3))
  const light = new THREE.DirectionalLight(0xffffff, 3)
  light.position.set(-3, 5, 7)
  scene.add(light)
  const rim = new THREE.DirectionalLight(0xffe655, 3)
  rim.position.set(4, 2, -3)
  scene.add(rim)
  const rest = clone(loaded.neutral.scene)
  const bounds = new THREE.Box3().setFromObject(rest)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  carrier.scale.setScalar(2.6 / Math.max(size.x, size.y, size.z))
  rest.position.copy(center).negate()
  carrier.add(rest)
  let mixer: THREE.AnimationMixer | undefined
  let action: THREE.AnimationAction | undefined
  if (loaded.animated?.animations.length) {
    // Both supplied exports share the same geometry and named object hierarchy.
    mixer = new THREE.AnimationMixer(rest)
    action = mixer.clipAction(loaded.animated.animations[0])
  }
  const fit = (width: number, height: number) => {
    camera.aspect = width / height
    camera.position.set(0, 0, 6.4 / Math.min(camera.aspect, 1))
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }
  fit(1, 1)
  return { scene, carrier, camera, rest, mixer, action, fit }
}
