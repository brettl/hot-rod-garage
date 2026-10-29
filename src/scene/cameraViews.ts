import * as THREE from 'three'

export type CameraView = 'exterior' | 'engineBay' | 'underside'

const PRESETS: Record<CameraView, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  exterior: { position: [4.5, 2.5, 6], lookAt: [0, 0.6, 0] },
  // Looks down into the open engine bay from above the front-right corner. Kept
  // forward of the bonnet hinge (x = 0.2) and above the front wheel tops
  // (y = 0.6) so neither the cabin, the open bonnet, nor the wheels occlude the
  // engine / forced-induction slots.
  engineBay: { position: [1.6, 1.8, 2.2], lookAt: [1.1, 0.6, 0] },
  // Ground-level camera looking up at the car once raiseOnJack() has lifted it
  // by 0.9 m (chassis underside then sits at y = 1.20).
  underside: { position: [0, 0.2, 2], lookAt: [0, 0.9, 0] },
}

export function setCameraView(camera: THREE.PerspectiveCamera, view: CameraView): void {
  const preset = PRESETS[view]
  camera.position.set(...preset.position)
  camera.lookAt(...preset.lookAt)
}
