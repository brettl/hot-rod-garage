import { GarageScene } from '../scene/GarageScene'
import { VehicleModel } from '../scene/VehicleModel'
import { setCameraView, CameraView } from '../scene/cameraViews'
import { driveIn } from '../scene/driveInAnimation'
import { loadPlayerState } from '../state/playerState'
import { computeStats } from '../state/stats'
import { VEHICLES } from '../data/vehicles'
import { navigateTo } from './router'
import { lastPurchasedVehicleId, clearLastPurchasedVehicleId } from './Dealership'

let scene: GarageScene | null = null
let activeModel: VehicleModel | null = null
let activeOwnedVehicleId: string | null = null

export function getActiveVehicleModel(): VehicleModel | null {
  return activeModel
}

export function getActiveOwnedVehicleId(): string | null {
  return activeOwnedVehicleId
}

/**
 * Pause the Three.js render loop. Called by the router whenever we navigate to a
 * screen other than the garage — the canvas is only hidden with `display: none`,
 * which does not stop requestAnimationFrame on its own.
 */
export function stopGarageScene(): void {
  scene?.stop()
}

function renderStatSheet(container: HTMLElement): void {
  const state = loadPlayerState()
  const owned = state.ownedVehicles.find(v => v.instanceId === activeOwnedVehicleId)
  if (!owned) return

  const def = VEHICLES.find(v => v.id === owned.vehicleDefId)!
  const installedPartDefIds = Object.values(owned.installedParts)
    .map(partInstanceId => state.inventory.find(p => p.instanceId === partInstanceId)?.partDefId)
    .filter((id): id is string => id !== undefined)
  const stats = computeStats(def.baseStats, installedPartDefIds)

  const sheet = container.querySelector('#stat-sheet')!
  sheet.innerHTML = `
    <li>RPM: ${stats.rpm}</li>
    <li>Power: ${stats.power} hp</li>
    <li>Torque: ${stats.torque} lb-ft</li>
    <li>Top Speed: ${stats.topSpeed} mph</li>
    <li>Weight: ${stats.weight} lb</li>
    <li>Height: ${stats.height} mm</li>
  `
}

export function renderGarageHUD(container: HTMLElement): void {
  const state = loadPlayerState()
  const owned = lastPurchasedVehicleId
    ? state.ownedVehicles.find(v => v.instanceId === lastPurchasedVehicleId)
    : state.ownedVehicles[0]

  if (!owned) {
    container.innerHTML = `<div class="screen"><p>No vehicle owned yet.</p><button id="back">Back</button></div>`
    container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))
    return
  }

  activeOwnedVehicleId = owned.instanceId
  const def = VEHICLES.find(v => v.id === owned.vehicleDefId)!

  const canvasContainer = document.querySelector<HTMLDivElement>('#garage-canvas-container')!
  if (!scene) {
    scene = new GarageScene(canvasContainer)
  }
  // start() is idempotent, and must run even when re-using an existing instance
  // that stopGarageScene() paused on the way out of the garage.
  scene.start()
  // clear any previously loaded vehicle
  if (activeModel) {
    scene.scene.remove(activeModel.group)
    activeModel.dispose()
  }

  activeModel = new VehicleModel(def)
  for (const [slot, partInstanceId] of Object.entries(owned.installedParts)) {
    const ownedPart = state.inventory.find(p => p.instanceId === partInstanceId)
    if (ownedPart) activeModel.setPart(slot as any, ownedPart.partDefId)
  }
  scene.scene.add(activeModel.group)
  setCameraView(scene.camera, 'exterior')

  const isNewPurchase = lastPurchasedVehicleId === owned.instanceId
  if (isNewPurchase) {
    driveIn(activeModel.group)
    clearLastPurchasedVehicleId()
  }

  container.innerHTML = `
    <div class="screen garage-hud">
      <h2>${def.name}</h2>
      <nav class="camera-controls">
        <button data-view="exterior">Exterior</button>
        <button data-view="engineBay">Open Bonnet</button>
        <button data-view="underside">Raise on Jack</button>
      </nav>
      <ul id="stat-sheet" class="stats"></ul>
      <nav>
        <button id="nav-parts">Parts Store</button>
        <button id="nav-inventory">Inventory</button>
        <button id="back">Main Menu</button>
      </nav>
    </div>
  `

  container.querySelectorAll<HTMLButtonElement>('button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as CameraView
      if (view === 'engineBay') activeModel!.openBonnet()
      else activeModel!.closeBonnet()
      if (view === 'underside') activeModel!.raiseOnJack()
      else activeModel!.lowerFromJack()
      setCameraView(scene!.camera, view)
    })
  })

  container.querySelector('#nav-parts')!.addEventListener('click', () => navigateTo('partsStore'))
  container.querySelector('#nav-inventory')!.addEventListener('click', () => navigateTo('inventory'))
  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))

  renderStatSheet(container)
}
