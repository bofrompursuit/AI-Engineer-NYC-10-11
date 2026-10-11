import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export default function PipModel() {
  const mountRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<(() => void) | null>(null);
  const restRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let mixer: THREE.AnimationMixer | undefined;
    let neutral: THREE.Group | undefined;
    let waving: THREE.Group | undefined;
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd7c7a7, 3.6));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 5, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe655, 2.4);
    rim.position.set(4, 2, -3);
    scene.add(rim);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const loader = new GLTFLoader();
    Promise.all([
      loader.loadAsync("/models/pip-neutral.glb"),
      loader.loadAsync("/models/pip-hover-wave.glb"),
    ]).then(([rest, wave]) => {
      if (disposed) return;
      neutral = rest.scene;
      waving = wave.scene;
      const bounds = new THREE.Box3().setFromObject(neutral);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 2.9 / Math.max(size.x, size.y, size.z);
      for (const model of [neutral, waving]) {
        model.position.copy(center).multiplyScalar(-1);
        model.scale.setScalar(scale);
        scene.add(model);
      }
      waving.visible = false;
      const scaledHeight = size.y * scale;
      camera.position.set(0, 0, Math.max(5.6, scaledHeight * 2.5));
      camera.lookAt(0, 0, 0);
      if (wave.animations.length) {
        mixer = new THREE.AnimationMixer(waving);
        const action = mixer.clipAction(wave.animations[0]);
        action.setLoop(THREE.LoopRepeat, Infinity);
        waveRef.current = () => {
          if (!neutral || !waving) return;
          neutral.visible = false;
          waving.visible = true;
          action.reset().play();
        };
        restRef.current = () => {
          if (!neutral || !waving) return;
          action.stop();
          waving.visible = false;
          neutral.visible = true;
        };
      }
    }).catch(() => { if (!disposed) setFailed(true); });

    const render = () => {
      frame = requestAnimationFrame(render);
      mixer?.update(Math.min(clock.getDelta(), 0.05));
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      waveRef.current = null;
      restRef.current = null;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="pip-model"
      role="img"
      aria-label="Pip, a floating black and white guide with a yellow emblem"
      tabIndex={0}
      onPointerEnter={() => waveRef.current?.()}
      onPointerLeave={() => restRef.current?.()}
      onFocus={() => waveRef.current?.()}
      onBlur={() => restRef.current?.()}
    >
      {failed && <span className="pip-model-error">Pip could not load.</span>}
    </div>
  );
}
