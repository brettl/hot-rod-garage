import { VEHICLES } from '../data/vehicles'
import { PARTS, STOCK_PART_IDS } from '../data/parts'
import type { PlayerState, OwnedVehicle, OwnedPart, PartSlot } from '../types'

const STORAGE_KEY = 'hot-rod-garage:player-state'

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createInitialState(): PlayerState {
  return { cash: 20000, ownedVehicles: [], inventory: [] }
}

export function loadPlayerState(): PlayerState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createInitialState()
  // A malformed or schema-mismatched save must not brick the app: every screen
  // (including the main menu rendered at startup) loads state on render, so an
  // uncaught parse error here would leave a permanently blank page.
  try {
    const parsed = JSON.parse(raw) as PlayerState
    const looksValid =
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof parsed.cash === 'number' &&
      Array.isArray(parsed.ownedVehicles) &&
      Array.isArray(parsed.inventory)
    if (!looksValid) return createInitialState()
    return parsed
  } catch {
    return createInitialState()
  }
}

export function savePlayerState(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function buyVehicle(state: PlayerState, vehicleDefId: string): PlayerState {
  const def = VEHICLES.find(v => v.id === vehicleDefId)
  if (!def) throw new Error(`Unknown vehicle: ${vehicleDefId}`)
  if (state.cash < def.price) throw new Error('Insufficient funds')

  const slots: PartSlot[] = ['engine', 'forcedInduction', 'suspension', 'exhaust']
  const stockParts: OwnedPart[] = slots.map(slot => ({ instanceId: makeId(), partDefId: STOCK_PART_IDS[slot] }))

  const installedParts = {} as Record<PartSlot, string>
  slots.forEach((slot, i) => {
    installedParts[slot] = stockParts[i].instanceId
  })

  const ownedVehicle: OwnedVehicle = { vehicleDefId, instanceId: makeId(), installedParts }

  const next: PlayerState = {
    cash: state.cash - def.price,
    ownedVehicles: [...state.ownedVehicles, ownedVehicle],
    inventory: [...state.inventory, ...stockParts],
  }
  savePlayerState(next)
  return next
}

export function buyPart(state: PlayerState, partDefId: string): PlayerState {
  const def = PARTS.find(p => p.id === partDefId)
  if (!def) throw new Error(`Unknown part: ${partDefId}`)
  if (state.cash < def.price) throw new Error('Insufficient funds')

  const owned: OwnedPart = { instanceId: makeId(), partDefId }
  const next: PlayerState = {
    cash: state.cash - def.price,
    ownedVehicles: state.ownedVehicles,
    inventory: [...state.inventory, owned],
  }
  savePlayerState(next)
  return next
}

export function installPart(state: PlayerState, vehicleInstanceId: string, partInstanceId: string): PlayerState {
  const vehicle = state.ownedVehicles.find(v => v.instanceId === vehicleInstanceId)
  if (!vehicle) throw new Error(`Unknown owned vehicle: ${vehicleInstanceId}`)

  const ownedPart = state.inventory.find(p => p.instanceId === partInstanceId)
  if (!ownedPart) throw new Error(`Unknown owned part: ${partInstanceId}`)

  // One physical part instance can only be bolted to one car. Without this guard
  // the same instance could be installed on two vehicles, double-counting its
  // stat bonus and making it permanently unsellable (sellPart refuses installed
  // parts, and it would then look installed everywhere).
  const alreadyInstalled = state.ownedVehicles.some(v =>
    Object.values(v.installedParts).includes(partInstanceId),
  )
  if (alreadyInstalled) throw new Error('Part is already installed on a vehicle — remove it first')

  const partDef = PARTS.find(p => p.id === ownedPart.partDefId)
  if (!partDef) throw new Error(`Unknown part definition: ${ownedPart.partDefId}`)
  const slot = partDef.slot

  const nextVehicles = state.ownedVehicles.map(v =>
    v.instanceId === vehicleInstanceId
      ? { ...v, installedParts: { ...v.installedParts, [slot]: partInstanceId } }
      : v,
  )

  const next: PlayerState = { ...state, ownedVehicles: nextVehicles }
  savePlayerState(next)
  return next
}

export function removePart(state: PlayerState, vehicleInstanceId: string, slot: PartSlot): PlayerState {
  const nextVehicles = state.ownedVehicles.map(v => {
    if (v.instanceId !== vehicleInstanceId) return v
    const installedParts = { ...v.installedParts }
    delete installedParts[slot]
    return { ...v, installedParts }
  })

  const next: PlayerState = { ...state, ownedVehicles: nextVehicles }
  savePlayerState(next)
  return next
}

export function sellPart(state: PlayerState, partInstanceId: string): PlayerState {
  const isInstalled = state.ownedVehicles.some(v =>
    Object.values(v.installedParts).includes(partInstanceId),
  )
  if (isInstalled) throw new Error('Cannot sell an installed part — remove it first')

  const ownedPart = state.inventory.find(p => p.instanceId === partInstanceId)
  if (!ownedPart) throw new Error(`Unknown owned part: ${partInstanceId}`)

  const def = PARTS.find(p => p.id === ownedPart.partDefId)
  if (!def) throw new Error(`Unknown part definition: ${ownedPart.partDefId}`)

  const next: PlayerState = {
    cash: state.cash + def.sellPrice,
    ownedVehicles: state.ownedVehicles,
    inventory: state.inventory.filter(p => p.instanceId !== partInstanceId),
  }
  savePlayerState(next)
  return next
}
