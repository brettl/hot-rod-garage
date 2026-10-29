import * as THREE from 'three'
import { PARTS, STOCK_PART_IDS } from '../data/parts'
import type { VehicleDef, PartSlot } from '../types'

const SLOT_COLORS: Record<string, number> = {
  'engine-stock': 0x777777,
  'engine-performance': 0x3366cc,
  'engine-race': 0xcc3333,
  'fi-none': 0x000000,
  turbo: 0x222233,
  supercharger: 0xc0c0c0,
  'suspension-stock': 0x555555,
  'suspension-hard': 0x992222,
  'suspension-soft': 0x3355aa,
  'suspension-sport': 0xcc7722,
  'suspension-rally': 0x228833,
  'exhaust-stock': 0x666666,
  'exhaust-torque': 0x996633,
  'exhaust-race': 0xdddddd,
}

// ---------------------------------------------------------------------------
// Body layout (metres). The body is deliberately NOT one solid box: it is an
// open chassis pan + a rear cabin shell, so the front half is a genuinely empty
// engine bay and the whole underside is exposed. Every part slot below sits in
// open air, which is what makes "open the bonnet" / "raise on jack" show
// anything at all.
// ---------------------------------------------------------------------------
const BODY_LENGTH = 4 // x: -2 (rear) .. +2 (front)
const BODY_WIDTH = 1.8 // z: -0.9 .. +0.9
const WHEEL_RADIUS = 0.3
const WHEEL_WIDTH = 0.2
const CHASSIS_THICKNESS = 0.15
const CHASSIS_BOTTOM = WHEEL_RADIUS // 0.30 — pan underside sits at wheel-centre height
const CHASSIS_TOP = CHASSIS_BOTTOM + CHASSIS_THICKNESS // 0.45
/** Boundary between the rear cabin and the open front engine bay (also the bonnet hinge line). */
const CABIN_FRONT_X = 0.2
const BODY_REAR_X = -BODY_LENGTH / 2 // -2
const BODY_FRONT_X = BODY_LENGTH / 2 // +2
const CABIN_LENGTH = CABIN_FRONT_X - BODY_REAR_X // 2.2
const BAY_LENGTH = BODY_FRONT_X - CABIN_FRONT_X // 1.8
const BONNET_THICKNESS = 0.05
/**
 * Bonnet swings up and back past vertical (~109 deg). Because the hinge sits at
 * roof height, every point of the panel stays at or above the roof line for any
 * angle in (0, 180), so it never clips the cabin.
 */
const BONNET_OPEN_ANGLE = 1.9
/**
 * Jack lift = 0.9 m (three wheel radii). Lifted, the chassis underside rises
 * from y 0.30 to y 1.20 and the exhaust from ~0.15 to ~1.05, both comfortably
 * above the ground-level 'underside' camera at y 0.2 looking up at y 0.9.
 */
const JACK_LIFT_HEIGHT = 0.9

export class VehicleModel {
  group: THREE.Group
  private bonnetGroup: THREE.Group
  private bonnetOpen = false
  private raisedOnJack = false
  private partMeshes: Partial<Record<PartSlot, THREE.Object3D>> = {}
  private installedPartIds: Partial<Record<PartSlot, string>> = {}

  constructor(vehicleDef: VehicleDef) {
    this.group = new THREE.Group()

    const heightScale = vehicleDef.baseStats.height / 1000 // mm -> meters

    // --- wheels: cylinder axis along Z, one at each corner ---------------
    const wheelCorners: [number, number][] = [
      [1.5, 0.9],
      [1.5, -0.9],
      [-1.5, 0.9],
      [-1.5, -0.9],
    ]
    for (const [x, z] of wheelCorners) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 16),
        new THREE.MeshStandardMaterial({ color: 0x222222 }),
      )
      wheel.rotation.x = Math.PI / 2
      wheel.position.set(x, WHEEL_RADIUS, z)
      wheel.name = `wheel-${x > 0 ? 'front' : 'rear'}-${z > 0 ? 'left' : 'right'}`
      this.group.add(wheel)
    }

    // --- chassis floor pan: full length/width, the car's "floor" ---------
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(BODY_LENGTH, CHASSIS_THICKNESS, BODY_WIDTH),
      new THREE.MeshStandardMaterial({ color: vehicleDef.color }),
    )
    chassis.position.y = CHASSIS_BOTTOM + CHASSIS_THICKNESS / 2
    chassis.name = 'chassis-floor'
    this.group.add(chassis)

    // --- cabin: rear portion only, leaving the front half open ----------
    const cabinHeight = heightScale - CHASSIS_TOP
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(CABIN_LENGTH, cabinHeight, BODY_WIDTH),
      new THREE.MeshStandardMaterial({ color: vehicleDef.color }),
    )
    cabin.position.set(BODY_REAR_X + CABIN_LENGTH / 2, CHASSIS_TOP + cabinHeight / 2, 0)
    cabin.name = 'cabin'
    this.group.add(cabin)

    // --- bonnet: hinged at the cabin/bay boundary (like a real hood at the
    //     windscreen base), covering the whole open bay ---------------------
    this.bonnetGroup = new THREE.Group()
    this.bonnetGroup.position.set(CABIN_FRONT_X, heightScale, 0)
    const bonnetPanel = new THREE.Mesh(
      new THREE.BoxGeometry(BAY_LENGTH, BONNET_THICKNESS, BODY_WIDTH),
      new THREE.MeshStandardMaterial({ color: vehicleDef.color }),
    )
    bonnetPanel.position.set(BAY_LENGTH / 2, 0, 0)
    bonnetPanel.name = 'bonnet-panel'
    this.bonnetGroup.add(bonnetPanel)
    this.group.add(this.bonnetGroup)

    // --- part slots, all in open air -------------------------------------
    // engine: centred in the open bay, sitting on the chassis floor
    const engineBay = new THREE.Group()
    engineBay.position.set(CABIN_FRONT_X + BAY_LENGTH / 2, CHASSIS_TOP + 0.25, 0)
    engineBay.name = 'slot-engine'
    this.group.add(engineBay)
    this.partMeshes.engine = engineBay

    // forced induction: mounted on top of the engine. Clamped so it stays clear
    // of the closed bonnet on the lowest-roofed vehicle (Roadster GT, 1.15 m).
    const forcedInductionSlot = new THREE.Group()
    forcedInductionSlot.position.set(
      CABIN_FRONT_X + BAY_LENGTH / 2,
      Math.min(CHASSIS_TOP + 0.55, heightScale - 0.2),
      0,
    )
    forcedInductionSlot.name = 'slot-forcedInduction'
    this.group.add(forcedInductionSlot)
    this.partMeshes.forcedInduction = forcedInductionSlot

    // suspension: 4 coil-spring stand-ins in the wheel wells (see setPart)
    const suspensionSlot = new THREE.Group()
    suspensionSlot.name = 'slot-suspension'
    this.group.add(suspensionSlot)
    this.partMeshes.suspension = suspensionSlot

    // exhaust: pipe below the chassis pan, running out the back
    const exhaustSlot = new THREE.Group()
    exhaustSlot.position.set(-1.6, 0.15, 0.3)
    exhaustSlot.name = 'slot-exhaust'
    this.group.add(exhaustSlot)
    this.partMeshes.exhaust = exhaustSlot

    this.setPart('engine', STOCK_PART_IDS.engine)
    this.setPart('forcedInduction', STOCK_PART_IDS.forcedInduction)
    this.setPart('suspension', STOCK_PART_IDS.suspension)
    this.setPart('exhaust', STOCK_PART_IDS.exhaust)
  }

  setPart(slot: PartSlot, partDefId: string): void {
    const container = this.partMeshes[slot]
    if (!container) return
    for (const child of container.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
        else child.material.dispose()
      }
    }
    container.clear()
    this.installedPartIds[slot] = partDefId

    const def = PARTS.find(p => p.id === partDefId)
    if (!def) return
    const color = SLOT_COLORS[partDefId] ?? 0xffffff

    if (slot === 'engine') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.8), new THREE.MeshStandardMaterial({ color }))
      container.add(mesh)
    } else if (slot === 'forcedInduction') {
      if (partDefId === 'fi-none') return
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12),
        new THREE.MeshStandardMaterial({ color }),
      )
      mesh.rotation.z = Math.PI / 2
      container.add(mesh)
    } else if (slot === 'suspension') {
      // Springs span ground level up to the chassis pan top, so the visible
      // 0.25 m below the pan reads as suspension between the wheels.
      const corners: [number, number][] = [
        [1.3, 0.8],
        [1.3, -0.8],
        [-1.3, 0.8],
        [-1.3, -0.8],
      ]
      for (const [x, z] of corners) {
        const spring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
          new THREE.MeshStandardMaterial({ color }),
        )
        spring.position.set(x, CHASSIS_TOP - 0.2, z)
        container.add(spring)
      }
    } else if (slot === 'exhaust') {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8),
        new THREE.MeshStandardMaterial({ color }),
      )
      pipe.rotation.z = Math.PI / 2
      container.add(pipe)
    }
  }

  openBonnet(): void {
    this.bonnetGroup.rotation.z = BONNET_OPEN_ANGLE
    this.bonnetOpen = true
  }

  closeBonnet(): void {
    this.bonnetGroup.rotation.z = 0
    this.bonnetOpen = false
  }

  isBonnetOpen(): boolean {
    return this.bonnetOpen
  }

  /** Lift the whole car so the underside is visible from a ground-level camera. */
  raiseOnJack(): void {
    if (this.raisedOnJack) return
    this.group.position.y += JACK_LIFT_HEIGHT
    this.raisedOnJack = true
  }

  /** Drop the car back onto its wheels. No-op if it is not currently raised. */
  lowerFromJack(): void {
    if (!this.raisedOnJack) return
    this.group.position.y -= JACK_LIFT_HEIGHT
    this.raisedOnJack = false
  }

  isRaisedOnJack(): boolean {
    return this.raisedOnJack
  }

  dispose(): void {
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
  }
}
