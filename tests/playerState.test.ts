import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  loadPlayerState,
  savePlayerState,
  buyVehicle,
  buyPart,
  installPart,
  removePart,
  sellPart,
} from '../src/state/playerState'

beforeEach(() => {
  localStorage.clear()
})

describe('createInitialState', () => {
  it('starts with $20,000 cash, no vehicles, empty inventory', () => {
    const state = createInitialState()
    expect(state.cash).toBe(20000)
    expect(state.ownedVehicles).toEqual([])
    expect(state.inventory).toEqual([])
  })
})

describe('persistence', () => {
  it('loadPlayerState returns a fresh initial state when nothing is saved', () => {
    expect(loadPlayerState()).toEqual(createInitialState())
  })

  it('savePlayerState then loadPlayerState round-trips', () => {
    const state = createInitialState()
    state.cash = 12345
    savePlayerState(state)
    expect(loadPlayerState().cash).toBe(12345)
  })

  it('loadPlayerState falls back to a fresh initial state when the save is corrupt', () => {
    localStorage.setItem('hot-rod-garage:player-state', '{not valid json')
    expect(loadPlayerState()).toEqual(createInitialState())

    localStorage.setItem('hot-rod-garage:player-state', '{"cash":"lots"}')
    expect(loadPlayerState()).toEqual(createInitialState())
  })
})

describe('buyVehicle', () => {
  it('deducts price, adds an OwnedVehicle with all 4 stock parts installed, and saves', () => {
    const state = createInitialState()
    const result = buyVehicle(state, 'rust-bucket-sedan')

    expect(result.cash).toBe(20000 - 3000)
    expect(result.ownedVehicles).toHaveLength(1)

    const owned = result.ownedVehicles[0]
    expect(owned.vehicleDefId).toBe('rust-bucket-sedan')
    expect(owned.installedParts.engine).toBeDefined()
    expect(owned.installedParts.forcedInduction).toBeDefined()
    expect(owned.installedParts.suspension).toBeDefined()
    expect(owned.installedParts.exhaust).toBeDefined()

    // the 4 stock OwnedParts should exist in inventory too (installed parts still live in inventory)
    expect(result.inventory).toHaveLength(4)

    expect(loadPlayerState().cash).toBe(17000)
  })

  it('throws if cash is insufficient', () => {
    const state = createInitialState()
    state.cash = 100
    expect(() => buyVehicle(state, 'rust-bucket-sedan')).toThrow()
  })
})

describe('buyPart', () => {
  it('deducts price and adds a loose OwnedPart to inventory', () => {
    const state = createInitialState()
    const result = buyPart(state, 'turbo')
    expect(result.cash).toBe(20000 - 1800)
    expect(result.inventory).toHaveLength(1)
    expect(result.inventory[0].partDefId).toBe('turbo')
  })

  it('throws if cash is insufficient', () => {
    const state = createInitialState()
    state.cash = 100
    expect(() => buyPart(state, 'turbo')).toThrow()
  })
})

describe('installPart / removePart', () => {
  it('installing a part into its matching slot replaces the previous part, which returns to inventory uninstalled', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    state = buyPart(state, 'engine-performance')

    const vehicleId = state.ownedVehicles[0].instanceId
    const newEnginePart = state.inventory.find(p => p.partDefId === 'engine-performance')!
    const oldEnginePartId = state.ownedVehicles[0].installedParts.engine

    state = installPart(state, vehicleId, newEnginePart.instanceId)

    expect(state.ownedVehicles[0].installedParts.engine).toBe(newEnginePart.instanceId)
    // old stock engine still exists in inventory, just no longer installed
    expect(state.inventory.some(p => p.instanceId === oldEnginePartId)).toBe(true)
  })

  it('installPart infers slot from the part itself', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    state = buyPart(state, 'turbo') // forcedInduction slot

    const vehicleId = state.ownedVehicles[0].instanceId
    const turboPart = state.inventory.find(p => p.partDefId === 'turbo')!
    const stockEngineId = state.ownedVehicles[0].installedParts.engine

    // The caller never names a slot — installPart reads it off the part
    // definition, so a turbo can only ever land in forcedInduction.
    state = installPart(state, vehicleId, turboPart.instanceId)

    expect(state.ownedVehicles[0].installedParts.forcedInduction).toBe(turboPart.instanceId)
    // and no other slot was touched
    expect(state.ownedVehicles[0].installedParts.engine).toBe(stockEngineId)
  })

  it('installPart throws when the part instance is already installed on another vehicle', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    state = buyVehicle(state, 'farm-truck')
    state = buyPart(state, 'turbo')

    const vehicleA = state.ownedVehicles[0].instanceId
    const vehicleB = state.ownedVehicles[1].instanceId
    expect(vehicleA).not.toBe(vehicleB)

    const turboPart = state.inventory.find(p => p.partDefId === 'turbo')!
    state = installPart(state, vehicleA, turboPart.instanceId)
    expect(state.ownedVehicles[0].installedParts.forcedInduction).toBe(turboPart.instanceId)

    // the same physical part cannot be bolted to a second car
    expect(() => installPart(state, vehicleB, turboPart.instanceId)).toThrow()
    // vehicle B keeps its own stock forced-induction part
    expect(state.ownedVehicles[1].installedParts.forcedInduction).not.toBe(turboPart.instanceId)
  })

  it('removePart moves the installed part out and leaves the slot on stock (undefined) until reinstalled', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    const vehicleId = state.ownedVehicles[0].instanceId
    const installedEngineId = state.ownedVehicles[0].installedParts.engine

    state = removePart(state, vehicleId, 'engine')

    expect(state.ownedVehicles[0].installedParts.engine).toBeUndefined()
    expect(state.inventory.some(p => p.instanceId === installedEngineId)).toBe(true)
  })
})

describe('sellPart', () => {
  it('removes a loose part from inventory and refunds sellPrice', () => {
    let state = createInitialState()
    state = buyPart(state, 'turbo')
    const cashAfterBuy = state.cash
    const partInstanceId = state.inventory[0].instanceId

    state = sellPart(state, partInstanceId)

    expect(state.inventory).toHaveLength(0)
    expect(state.cash).toBe(cashAfterBuy + 900) // turbo sellPrice
  })

  it('throws when trying to sell a part that is currently installed on a vehicle', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    const installedEngineId = state.ownedVehicles[0].installedParts.engine

    expect(() => sellPart(state, installedEngineId!)).toThrow()
  })

  it('allows selling a part after it has been removed from a vehicle, refunding its sellPrice', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    state = buyPart(state, 'turbo')

    const vehicleId = state.ownedVehicles[0].instanceId
    const turboPart = state.inventory.find(p => p.partDefId === 'turbo')!

    state = installPart(state, vehicleId, turboPart.instanceId)
    expect(state.ownedVehicles[0].installedParts.forcedInduction).toBe(turboPart.instanceId)

    state = removePart(state, vehicleId, 'forcedInduction')
    expect(state.ownedVehicles[0].installedParts.forcedInduction).toBeUndefined()
    expect(state.inventory.some(p => p.instanceId === turboPart.instanceId)).toBe(true)

    const cashBeforeSell = state.cash
    state = sellPart(state, turboPart.instanceId)

    expect(state.cash).toBe(cashBeforeSell + 900) // turbo sellPrice
    expect(state.inventory.some(p => p.instanceId === turboPart.instanceId)).toBe(false)
  })
})
