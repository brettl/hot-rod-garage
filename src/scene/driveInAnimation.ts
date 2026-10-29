import * as THREE from 'three'

const START = new THREE.Vector3(0, 0, 10)
const END = new THREE.Vector3(0, 0, 0)
const DURATION_MS = 1500

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function driveIn(group: THREE.Group, onComplete?: () => void): void {
  group.position.copy(START)
  const startTime = performance.now()

  function step(now: number): void {
    const elapsed = now - startTime
    const t = Math.min(elapsed / DURATION_MS, 1)
    const eased = easeOutCubic(t)
    group.position.z = THREE.MathUtils.lerp(START.z, END.z, eased)

    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  requestAnimationFrame(step)
}
