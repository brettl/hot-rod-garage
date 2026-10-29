import { PARTS, STOCK_PART_IDS } from '../data/parts'
import { loadPlayerState, installPart, removePart, sellPart } from '../state/playerState'
import { navigateTo } from './router'
import { getActiveVehicleModel, getActiveOwnedVehicleId } from './GarageHUD'
import type { PartSlot } from '../types'

export function renderInventory(container: HTMLElement): void {
  const state = loadPlayerState()

  // "Installed" is a property of the whole save, not of whichever vehicle the
  // garage happens to have loaded: this screen is reachable straight from the
  // main menu, in which case no vehicle is active at all.
  const installedLocations = new Map<string, { vehicleInstanceId: string; slot: PartSlot }>()
  for (const vehicle of state.ownedVehicles) {
    for (const [slot, partInstanceId] of Object.entries(vehicle.installedParts)) {
      installedLocations.set(partInstanceId, { vehicleInstanceId: vehicle.instanceId, slot: slot as PartSlot })
    }
  }
  const installedInstanceIds = new Set(installedLocations.keys())

  // Installing still needs one concrete target vehicle. Prefer the garage's
  // active vehicle; fall back to the first owned one so Install works even when
  // the garage was never opened this session.
  const targetVehicleId = getActiveOwnedVehicleId() ?? state.ownedVehicles[0]?.instanceId

  const rows = state.inventory
    .map(owned => {
      const def = PARTS.find(p => p.id === owned.partDefId)!
      const isInstalled = installedInstanceIds.has(owned.instanceId)
      const location = installedLocations.get(owned.instanceId)
      return `
        <tr>
          <td>${def.name}</td>
          <td>${def.slot}</td>
          <td>${isInstalled ? 'Installed' : 'In inventory'}</td>
          <td>
            ${!isInstalled && targetVehicleId ? `<button data-action="install" data-part-instance="${owned.instanceId}">Install</button>` : ''}
            ${isInstalled && location ? `<button data-action="remove" data-vehicle-instance="${location.vehicleInstanceId}" data-slot="${location.slot}">Remove</button>` : ''}
            ${!isInstalled && def.price > 0 ? `<button data-action="sell" data-part-instance="${owned.instanceId}">Sell ($${def.sellPrice.toLocaleString()})</button>` : ''}
          </td>
        </tr>
      `
    })
    .join('')

  container.innerHTML = `
    <div class="screen inventory">
      <h1>Inventory</h1>
      <p class="cash">Cash: $${state.cash.toLocaleString()}</p>
      <table>
        <thead><tr><th>Part</th><th>Slot</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No parts owned yet</td></tr>'}</tbody>
      </table>
      <button id="back">Back</button>
    </div>
  `

  container.querySelectorAll<HTMLButtonElement>('button[data-action="install"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!targetVehicleId) return
      const partInstanceId = btn.dataset.partInstance!
      try {
        installPart(loadPlayerState(), targetVehicleId, partInstanceId)
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      syncActiveModel(targetVehicleId)
      renderInventory(container)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('button[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const vehicleInstanceId = btn.dataset.vehicleInstance!
      const slot = btn.dataset.slot as PartSlot
      try {
        removePart(loadPlayerState(), vehicleInstanceId, slot)
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      syncActiveModel(vehicleInstanceId)
      renderInventory(container)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('button[data-action="sell"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const partInstanceId = btn.dataset.partInstance!
      try {
        sellPart(loadPlayerState(), partInstanceId)
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      renderInventory(container)
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('garage'))
}

const ALL_SLOTS: PartSlot[] = ['engine', 'forcedInduction', 'suspension', 'exhaust']

function syncActiveModel(vehicleInstanceId: string): void {
  const model = getActiveVehicleModel()
  // Only the vehicle currently loaded in the 3D garage can be updated live; a
  // change to any other owned vehicle is picked up next time it is loaded.
  if (!model || getActiveOwnedVehicleId() !== vehicleInstanceId) return

  const state = loadPlayerState()
  const owned = state.ownedVehicles.find(v => v.instanceId === vehicleInstanceId)
  if (!owned) return

  // Iterate every slot (not just the ones present in installedParts): removePart()
  // deletes the slot key entirely rather than replacing it with the stock part id,
  // so a slot with no entry must be explicitly reset to its stock appearance here —
  // otherwise the live 3D model keeps showing the just-removed part's mesh forever.
  for (const slot of ALL_SLOTS) {
    const partInstanceId = owned.installedParts[slot]
    const ownedPart = partInstanceId ? state.inventory.find(p => p.instanceId === partInstanceId) : undefined
    model.setPart(slot, ownedPart ? ownedPart.partDefId : STOCK_PART_IDS[slot])
  }
}
