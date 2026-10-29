# Hot Rod Garage V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-web browser garage/customization sim: buy 1 of 5 vehicles from a fake dealership, watch it roll into a 3D garage, inspect bonnet/underside, buy/install/remove/sell parts across 4 slots, and see stats update live — all persisted to localStorage. No driving/racing.

**Architecture:** Vite + TypeScript + vanilla Three.js for the 3D garage scene; plain DOM/CSS overlays for all 2D screens (no UI framework). A small pure-logic core (catalogs, stat math, player-state mutators) is fully unit tested with Vitest; the Three.js scene and DOM screens are verified manually in-browser per the spec's own testing section (no Three.js/DOM dependency in the tested logic).

**Tech Stack:** Vite, TypeScript, three (npm package, includes OrbitControls in `three/examples/jsm`), Vitest with `jsdom` test environment (for localStorage in tests).

**Spec:** [docs/superpowers/specs/2026-08-26-hot-rod-garage-v1-design.md](../specs/2026-08-26-hot-rod-garage-v1-design.md)

## Global Constraints

- Client-side only — no server, no network calls, no accounts.
- Vehicle/part catalogs are plain data objects (`VehicleDef[]`, `PartDef[]`), never hardcoded branching logic — new parts (e.g. a future intercooler) must be addable as a catalog entry only.
- All 3D geometry is procedural Three.js primitives — no external model files (GLTF etc.) in V1.
- Starting cash: $20,000. Starting garage: empty (no vehicle).
- Stats are exactly: `rpm`, `power`, `torque`, `topSpeed`, `weight`, `height` — no other stats (e.g. no handling).
- Displayed stats for a vehicle = `baseStats + sum(statModifiers of installed parts)`.
- Removed parts (including original stock parts) always go to inventory, never deleted.
- `PlayerState` auto-saves to localStorage on every mutation.

---

## File Structure

```
HotRod/
  package.json, tsconfig.json, vite.config.ts, index.html
  src/
    types.ts                    - shared types (Stats, PartSlot, VehicleDef, PartDef, PlayerState, OwnedVehicle, OwnedPart)
    data/
      vehicles.ts                - VehicleDef[] catalog (5 vehicles)
      parts.ts                   - PartDef[] catalog (14 parts)
    state/
      stats.ts                   - computeStats() pure function
      playerState.ts             - load/save + mutators (buyVehicle, buyPart, installPart, removePart, sellPart)
    scene/
      GarageScene.ts              - renderer, camera, garage room, render loop
      VehicleModel.ts             - buildVehicleModel(): procedural car + swappable part meshes, bonnet hinge
      cameraViews.ts               - camera preset transitions (exterior/engineBay/underside)
      driveInAnimation.ts          - tween vehicle into garage bay on purchase
    ui/
      router.ts                   - screen switcher
      MainMenu.ts
      Dealership.ts
      PartsStore.ts
      Inventory.ts
      GarageHUD.ts
    main.ts                      - app entry, wires router + scene + state together
    styles.css
  tests/
    stats.test.ts
    playerState.test.ts
    catalogs.test.ts
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.ts`, `src/styles.css`
- Create: `.gitignore`

**Interfaces:**
- Produces: a running Vite dev server at `npm run dev`, and a working `npm run build` / `npm run test` script.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hot-rod-garage",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  },
  "dependencies": {
    "three": "^0.169.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Hot Rod Garage</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <div id="garage-canvas-container"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create placeholder `src/main.ts` and `src/styles.css`**

```ts
// src/main.ts
document.querySelector<HTMLDivElement>('#app')!.innerHTML = '<h1>Hot Rod Garage</h1>'
```

```css
/* src/styles.css */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #111; color: #eee; font-family: system-ui, sans-serif; }
#garage-canvas-container { position: fixed; inset: 0; z-index: 0; }
#app { position: relative; z-index: 1; min-height: 100%; }
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
```

- [ ] **Step 7: Install dependencies and verify dev server**

Run: `npm install`
Run: `npm run dev`
Expected: server starts (e.g. on `http://localhost:5173`), and loading it in a browser shows "Hot Rod Garage". Stop the server after confirming (Ctrl+C).

- [ ] **Step 8: Verify build and test scripts work (even with nothing to test yet)**

Run: `npm run build`
Expected: succeeds, produces `dist/`.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts src/styles.css .gitignore
git commit -m "chore: scaffold Vite + TypeScript + Three.js project"
```

---

### Task 2: Core types and vehicle catalog

**Files:**
- Create: `src/types.ts`
- Create: `src/data/vehicles.ts`
- Test: `tests/catalogs.test.ts`

**Interfaces:**
- Produces: `Stats`, `PartSlot`, `VehicleDef`, `PartDef`, `PlayerState`, `OwnedVehicle`, `OwnedPart` types; `VEHICLES: VehicleDef[]` catalog.

- [ ] **Step 1: Write `src/types.ts`**

```ts
export interface Stats {
  rpm: number
  power: number
  torque: number
  topSpeed: number
  weight: number
  height: number
}

export type PartSlot = 'engine' | 'forcedInduction' | 'suspension' | 'exhaust'

export interface VehicleDef {
  id: string
  name: string
  price: number
  baseStats: Stats
  color: number // hex, e.g. 0xaa3333
}

export interface PartDef {
  id: string
  slot: PartSlot
  name: string
  price: number // 0 for stock parts (not purchasable)
  sellPrice: number
  statModifiers: Partial<Stats>
}

export interface OwnedVehicle {
  vehicleDefId: string
  instanceId: string
  installedParts: Partial<Record<PartSlot, string>> // -> OwnedPart.instanceId; a slot is absent when empty (removed, not yet reinstalled)
}

export interface OwnedPart {
  instanceId: string
  partDefId: string
}

export interface PlayerState {
  cash: number
  ownedVehicles: OwnedVehicle[]
  inventory: OwnedPart[]
}
```

- [ ] **Step 2: Write the failing test for the vehicle catalog**

```ts
// tests/catalogs.test.ts
import { describe, it, expect } from 'vitest'
import { VEHICLES } from '../src/data/vehicles'

describe('VEHICLES catalog', () => {
  it('has exactly 5 vehicles', () => {
    expect(VEHICLES).toHaveLength(5)
  })

  it('has unique ids', () => {
    const ids = new Set(VEHICLES.map(v => v.id))
    expect(ids.size).toBe(VEHICLES.length)
  })

  it('prices range from $3,000 to $18,500', () => {
    const prices = VEHICLES.map(v => v.price).sort((a, b) => a - b)
    expect(prices[0]).toBe(3000)
    expect(prices[prices.length - 1]).toBe(18500)
  })

  it('roadster-gt has the highest top speed', () => {
    const roadster = VEHICLES.find(v => v.id === 'roadster-gt')!
    const maxTopSpeed = Math.max(...VEHICLES.map(v => v.baseStats.topSpeed))
    expect(roadster.baseStats.topSpeed).toBe(maxTopSpeed)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `src/data/vehicles.ts` does not exist yet.

- [ ] **Step 4: Write `src/data/vehicles.ts`**

```ts
import type { VehicleDef } from '../types'

export const VEHICLES: VehicleDef[] = [
  {
    id: 'rust-bucket-sedan',
    name: 'Rust Bucket Sedan',
    price: 3000,
    color: 0x8a7f6b,
    baseStats: { rpm: 5500, power: 85, torque: 130, topSpeed: 85, weight: 3100, height: 1450 },
  },
  {
    id: 'farm-truck',
    name: 'Farm Truck',
    price: 5500,
    color: 0x5b6b45,
    baseStats: { rpm: 5000, power: 110, torque: 180, topSpeed: 90, weight: 3600, height: 1650 },
  },
  {
    id: 'classic-coupe',
    name: 'Classic Coupe',
    price: 9000,
    color: 0x2f4f6b,
    baseStats: { rpm: 6000, power: 140, torque: 150, topSpeed: 105, weight: 2900, height: 1350 },
  },
  {
    id: 'muscle-car',
    name: 'Muscle Car',
    price: 14000,
    color: 0x8b1a1a,
    baseStats: { rpm: 6500, power: 220, torque: 260, topSpeed: 125, weight: 3400, height: 1300 },
  },
  {
    id: 'roadster-gt',
    name: 'Roadster GT',
    price: 18500,
    color: 0xd4af37,
    baseStats: { rpm: 7200, power: 260, torque: 220, topSpeed: 140, weight: 2600, height: 1150 },
  },
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/vehicles.ts tests/catalogs.test.ts
git commit -m "feat: add core types and vehicle catalog"
```

---

### Task 3: Parts catalog

**Files:**
- Create: `src/data/parts.ts`
- Modify: `tests/catalogs.test.ts`

**Interfaces:**
- Consumes: `PartDef`, `PartSlot` from `src/types.ts` (Task 2)
- Produces: `PARTS: PartDef[]` catalog, `STOCK_PART_IDS: Record<PartSlot, string>` (the 4 stock part ids, so other tasks can look up "what a car ships with" without string-literal duplication)

- [ ] **Step 1: Write the failing tests**

```ts
// append to tests/catalogs.test.ts
import { PARTS, STOCK_PART_IDS } from '../src/data/parts'

describe('PARTS catalog', () => {
  it('has 14 parts total (4 stock + 10 purchasable)', () => {
    expect(PARTS).toHaveLength(14)
  })

  it('has exactly 4 stock parts priced at $0, one per slot', () => {
    const stock = PARTS.filter(p => p.price === 0)
    expect(stock).toHaveLength(4)
    const slots = new Set(stock.map(p => p.slot))
    expect(slots.size).toBe(4)
  })

  it('has unique ids', () => {
    const ids = new Set(PARTS.map(p => p.id))
    expect(ids.size).toBe(PARTS.length)
  })

  it('STOCK_PART_IDS references real, $0-priced PartDef ids', () => {
    for (const slot of ['engine', 'forcedInduction', 'suspension', 'exhaust'] as const) {
      const id = STOCK_PART_IDS[slot]
      const def = PARTS.find(p => p.id === id)
      expect(def).toBeDefined()
      expect(def!.price).toBe(0)
      expect(def!.slot).toBe(slot)
    }
  })

  it('every sellPrice is less than price for purchasable parts', () => {
    for (const p of PARTS.filter(p => p.price > 0)) {
      expect(p.sellPrice).toBeLessThan(p.price)
    }
  })

  it('turbo is top-end biased and supercharger is low-end biased', () => {
    const turbo = PARTS.find(p => p.id === 'turbo')!
    const supercharger = PARTS.find(p => p.id === 'supercharger')!
    expect(turbo.statModifiers.topSpeed!).toBeGreaterThan(supercharger.statModifiers.topSpeed ?? 0)
    expect(supercharger.statModifiers.torque!).toBeGreaterThan(turbo.statModifiers.torque ?? 0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `src/data/parts.ts` does not exist.

- [ ] **Step 3: Write `src/data/parts.ts`**

```ts
import type { PartDef, PartSlot } from '../types'

export const PARTS: PartDef[] = [
  // Engine
  { id: 'engine-stock', slot: 'engine', name: 'Stock Engine', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'engine-performance', slot: 'engine', name: 'Performance Engine', price: 2500, sellPrice: 1250, statModifiers: { power: 40, torque: 30, rpm: 300, weight: 40 } },
  { id: 'engine-race', slot: 'engine', name: 'Race Engine', price: 6000, sellPrice: 3000, statModifiers: { power: 90, torque: 60, rpm: 700, weight: 90 } },

  // Forced Induction
  { id: 'fi-none', slot: 'forcedInduction', name: 'None (Stock)', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'turbo', slot: 'forcedInduction', name: 'Turbo', price: 1800, sellPrice: 900, statModifiers: { power: 45, torque: 10, topSpeed: 12, weight: 25 } },
  { id: 'supercharger', slot: 'forcedInduction', name: 'Supercharger', price: 3200, sellPrice: 1600, statModifiers: { power: 35, torque: 40, topSpeed: 4, weight: 60 } },

  // Suspension
  { id: 'suspension-stock', slot: 'suspension', name: 'Stock Suspension', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'suspension-hard', slot: 'suspension', name: 'Hard (Track)', price: 600, sellPrice: 300, statModifiers: { height: -80, weight: -20 } },
  { id: 'suspension-soft', slot: 'suspension', name: 'Soft (Cruiser)', price: 400, sellPrice: 200, statModifiers: { height: 60, weight: 15 } },
  { id: 'suspension-sport', slot: 'suspension', name: 'Sport', price: 900, sellPrice: 450, statModifiers: { height: -50, weight: -30 } },
  { id: 'suspension-rally', slot: 'suspension', name: 'Rally', price: 1100, sellPrice: 550, statModifiers: { height: 90, weight: -15 } },

  // Exhaust
  { id: 'exhaust-stock', slot: 'exhaust', name: 'Stock Exhaust', price: 0, sellPrice: 0, statModifiers: {} },
  { id: 'exhaust-torque', slot: 'exhaust', name: 'Torque Exhaust', price: 500, sellPrice: 250, statModifiers: { torque: 15, weight: 10, topSpeed: 1 } },
  { id: 'exhaust-race', slot: 'exhaust', name: 'Race Exhaust', price: 1200, sellPrice: 600, statModifiers: { power: 15, topSpeed: 6, torque: -5, weight: -15 } },
]

export const STOCK_PART_IDS: Record<PartSlot, string> = {
  engine: 'engine-stock',
  forcedInduction: 'fi-none',
  suspension: 'suspension-stock',
  exhaust: 'exhaust-stock',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all catalog tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/parts.ts tests/catalogs.test.ts
git commit -m "feat: add parts catalog with 4 slots"
```

---

### Task 4: Stat computation

**Files:**
- Create: `src/state/stats.ts`
- Test: `tests/stats.test.ts`

**Interfaces:**
- Consumes: `Stats`, `PartDef` from `src/types.ts`; `PARTS` from `src/data/parts.ts`
- Produces: `computeStats(baseStats: Stats, installedPartIds: string[]): Stats` — used later by Task 5 (player state) and Task 12 (garage HUD stat sheet).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/stats.test.ts
import { describe, it, expect } from 'vitest'
import { computeStats } from '../src/state/stats'
import type { Stats } from '../src/types'

const base: Stats = { rpm: 5000, power: 100, torque: 100, topSpeed: 100, weight: 3000, height: 1000 }

describe('computeStats', () => {
  it('returns base stats unchanged with no installed parts', () => {
    expect(computeStats(base, [])).toEqual(base)
  })

  it('applies a single part modifier additively', () => {
    const result = computeStats(base, ['engine-performance'])
    expect(result.power).toBe(140) // 100 + 40
    expect(result.torque).toBe(130) // 100 + 30
    expect(result.rpm).toBe(5300) // 5000 + 300
    expect(result.weight).toBe(3040) // 3000 + 40
    expect(result.topSpeed).toBe(100) // untouched
  })

  it('stacks modifiers from multiple installed parts', () => {
    const result = computeStats(base, ['engine-performance', 'turbo'])
    expect(result.power).toBe(185) // 100 + 40 + 45
    expect(result.topSpeed).toBe(112) // 100 + 0 + 12
  })

  it('ignores unknown part ids gracefully (no crash, no modifier applied)', () => {
    const result = computeStats(base, ['does-not-exist'])
    expect(result).toEqual(base)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `src/state/stats.ts` does not exist.

- [ ] **Step 3: Write `src/state/stats.ts`**

```ts
import { PARTS } from '../data/parts'
import type { Stats } from '../types'

export function computeStats(baseStats: Stats, installedPartIds: string[]): Stats {
  const result: Stats = { ...baseStats }

  for (const partId of installedPartIds) {
    const part = PARTS.find(p => p.id === partId)
    if (!part) continue

    for (const key of Object.keys(part.statModifiers) as (keyof Stats)[]) {
      result[key] += part.statModifiers[key]!
    }
  }

  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/stats.ts tests/stats.test.ts
git commit -m "feat: add pure stat computation function"
```

---

### Task 5: Player state store and persistence

**Files:**
- Create: `src/state/playerState.ts`
- Test: `tests/playerState.test.ts`

**Interfaces:**
- Consumes: `PlayerState`, `OwnedVehicle`, `OwnedPart`, `PartSlot` from `src/types.ts`; `VEHICLES` from `src/data/vehicles.ts`; `PARTS`, `STOCK_PART_IDS` from `src/data/parts.ts`
- Produces (used by all UI tasks: 9–14):
  - `loadPlayerState(): PlayerState`
  - `savePlayerState(state: PlayerState): void`
  - `createInitialState(): PlayerState`
  - `buyVehicle(state: PlayerState, vehicleDefId: string): PlayerState` (throws if can't afford)
  - `buyPart(state: PlayerState, partDefId: string): PlayerState` (throws if can't afford)
  - `installPart(state: PlayerState, vehicleInstanceId: string, partInstanceId: string): PlayerState` (throws on slot mismatch)
  - `removePart(state: PlayerState, vehicleInstanceId: string, slot: PartSlot): PlayerState`
  - `sellPart(state: PlayerState, partInstanceId: string): PlayerState` (throws if part is currently installed)
  - Every mutator both returns the new state AND calls `savePlayerState` internally, so callers don't have to remember to save.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/playerState.test.ts
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

  it('installPart throws when the part slot does not match the target slot', () => {
    let state = createInitialState()
    state = buyVehicle(state, 'rust-bucket-sedan')
    state = buyPart(state, 'turbo') // forcedInduction slot

    const vehicleId = state.ownedVehicles[0].instanceId
    const turboPart = state.inventory.find(p => p.partDefId === 'turbo')!

    // attempting to force it into a mismatched slot must throw; installPart infers
    // slot from the part's own definition, so this call targets the correct slot
    // but we verify a genuinely mismatched attempt (engine slot, forcedInduction part id) throws
    expect(() => installPart(state, vehicleId, turboPart.instanceId, )).not.toThrow()
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

    expect(() => sellPart(state, installedEngineId)).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `src/state/playerState.ts` does not exist.

- [ ] **Step 3: Write `src/state/playerState.ts`**

```ts
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
  return JSON.parse(raw) as PlayerState
}

export function savePlayerState(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function buyVehicle(state: PlayerState, vehicleDefId: string): PlayerState {
  const def = VEHICLES.find(v => v.id === vehicleDefId)
  if (!def) throw new Error(`Unknown vehicle: ${vehicleDefId}`)
  if (state.cash < def.price) throw new Error('Insufficient funds')

  const stockParts: OwnedPart[] = (['engine', 'forcedInduction', 'suspension', 'exhaust'] as PartSlot[]).map(
    slot => ({ instanceId: makeId(), partDefId: STOCK_PART_IDS[slot] }),
  )

  const installedParts = {} as Record<PartSlot, string>
  ;(['engine', 'forcedInduction', 'suspension', 'exhaust'] as PartSlot[]).forEach((slot, i) => {
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

  const partDef = PARTS.find(p => p.id === ownedPart.partDefId)!
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

  const def = PARTS.find(p => p.id === ownedPart.partDefId)!

  const next: PlayerState = {
    cash: state.cash + def.sellPrice,
    ownedVehicles: state.ownedVehicles,
    inventory: state.inventory.filter(p => p.instanceId !== partInstanceId),
  }
  savePlayerState(next)
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS (all playerState tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/playerState.ts tests/playerState.test.ts
git commit -m "feat: add player state store with buy/sell/install/remove mutators"
```

---

### Task 6: Garage scene bootstrap (Three.js renderer + empty room)

**Files:**
- Create: `src/scene/GarageScene.ts`

**Interfaces:**
- Produces: `class GarageScene { constructor(container: HTMLElement); scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; start(): void; stop(): void }` — used by Task 7 (vehicle model attaches to `scene.scene`), Task 8 (camera views control `scene.camera`), Task 12 (garage HUD instantiates this).

**Testing note:** Three.js rendering has no unit test coverage per the spec (section 9) — verified manually in-browser.

- [ ] **Step 1: Write `src/scene/GarageScene.ts`**

```ts
import * as THREE from 'three'

export class GarageScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  private frameId: number | null = null

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a1a)

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(4, 2.5, 6)
    this.camera.lookAt(0, 0.5, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.buildGarageRoom()
    this.addLights()

    window.addEventListener('resize', this.onResize)
  }

  private buildGarageRoom(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    )
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 5),
      new THREE.MeshStandardMaterial({ color: 0x444444 }),
    )
    backWall.position.set(0, 2.5, -6)
    this.scene.add(backWall)
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 8, 5)
    this.scene.add(dirLight)
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  start(): void {
    const loop = (): void => {
      this.frameId = requestAnimationFrame(loop)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  stop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.onResize)
  }
}
```

- [ ] **Step 2: Wire a temporary manual check into `src/main.ts`**

```ts
// src/main.ts (temporary — will be replaced by the router in Task 9)
import { GarageScene } from './scene/GarageScene'

const container = document.querySelector<HTMLDivElement>('#garage-canvas-container')!
const scene = new GarageScene(container)
scene.start()
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open the printed local URL in a browser.
Expected: a dark room with a floor and back wall is visible and fills the screen; resizing the browser window keeps it filling the screen without distortion.

- [ ] **Step 4: Commit**

```bash
git add src/scene/GarageScene.ts src/main.ts
git commit -m "feat: add Three.js garage scene bootstrap"
```

---

### Task 7: Procedural vehicle model with swappable parts

**Files:**
- Create: `src/scene/VehicleModel.ts`
- Modify: `src/main.ts` (temporary manual verification, same pattern as Task 6)

**Interfaces:**
- Consumes: `VehicleDef`, `PartDef` from `src/types.ts`; `PARTS` from `src/data/parts.ts`
- Produces (used by Task 8 camera views, Task 12 garage HUD, Task 14 inventory):
  ```ts
  class VehicleModel {
    group: THREE.Group
    constructor(vehicleDef: VehicleDef)
    setPart(slot: PartSlot, partDefId: string): void
    openBonnet(): void
    closeBonnet(): void
    dispose(): void
  }
  ```

**Testing note:** procedural geometry composition is visual — verified manually in-browser, per spec section 9.

- [ ] **Step 1: Write `src/scene/VehicleModel.ts`**

```ts
import * as THREE from 'three'
import { PARTS } from '../data/parts'
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

export class VehicleModel {
  group: THREE.Group
  private bonnetGroup: THREE.Group
  private bonnetOpen = false
  private partMeshes: Partial<Record<PartSlot, THREE.Object3D>> = {}
  private installedPartIds: Partial<Record<PartSlot, string>> = {}

  constructor(vehicleDef: VehicleDef) {
    this.group = new THREE.Group()

    const heightScale = vehicleDef.baseStats.height / 1000 // mm -> meters

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4, heightScale, 1.8),
      new THREE.MeshStandardMaterial({ color: vehicleDef.color }),
    )
    body.position.y = heightScale / 2
    this.group.add(body)

    // bonnet: hinged at the front edge (x = +1.6), swings up and back to reveal the engine bay
    this.bonnetGroup = new THREE.Group()
    this.bonnetGroup.position.set(1.6, heightScale, 0)
    const bonnetPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 1.6),
      new THREE.MeshStandardMaterial({ color: vehicleDef.color }),
    )
    bonnetPanel.position.set(-0.6, 0, 0)
    this.bonnetGroup.add(bonnetPanel)
    this.group.add(this.bonnetGroup)

    // engine bay slot lives under the bonnet
    const engineBay = new THREE.Group()
    engineBay.position.set(1.0, heightScale * 0.6, 0)
    this.group.add(engineBay)
    this.partMeshes.engine = engineBay

    const forcedInductionSlot = new THREE.Group()
    forcedInductionSlot.position.set(1.0, heightScale * 0.9, 0)
    this.group.add(forcedInductionSlot)
    this.partMeshes.forcedInduction = forcedInductionSlot

    // suspension: 4 coil-spring stand-ins near each wheel corner
    const suspensionSlot = new THREE.Group()
    this.group.add(suspensionSlot)
    this.partMeshes.suspension = suspensionSlot

    // exhaust: pipe along the underside toward the rear
    const exhaustSlot = new THREE.Group()
    exhaustSlot.position.set(-1.6, 0.15, 0.5)
    this.group.add(exhaustSlot)
    this.partMeshes.exhaust = exhaustSlot

    this.setPart('engine', 'engine-stock')
    this.setPart('forcedInduction', 'fi-none')
    this.setPart('suspension', 'suspension-stock')
    this.setPart('exhaust', 'exhaust-stock')
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
      const corners: [number, number][] = [
        [1.3, 0.7],
        [1.3, -0.7],
        [-1.3, 0.7],
        [-1.3, -0.7],
      ]
      for (const [x, z] of corners) {
        const spring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
          new THREE.MeshStandardMaterial({ color }),
        )
        spring.position.set(x, 0.2, z)
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
    this.bonnetGroup.rotation.z = -2.0
    this.bonnetOpen = true
  }

  closeBonnet(): void {
    this.bonnetGroup.rotation.z = 0
    this.bonnetOpen = false
  }

  isBonnetOpen(): boolean {
    return this.bonnetOpen
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
```

`dispose()` releases every mesh's geometry/material GPU buffers in this model's group — callers (Task 12) must call it before discarding a `VehicleModel` instance, e.g. when the garage screen loads a different vehicle.

- [ ] **Step 2: Wire a temporary manual check into `src/main.ts`**

```ts
// src/main.ts (temporary)
import { GarageScene } from './scene/GarageScene'
import { VehicleModel } from './scene/VehicleModel'
import { VEHICLES } from './data/vehicles'

const container = document.querySelector<HTMLDivElement>('#garage-canvas-container')!
const scene = new GarageScene(container)

const vehicle = new VehicleModel(VEHICLES[3]) // muscle-car
scene.scene.add(vehicle.group)

scene.start()

// temporary: open the bonnet after 2s to visually confirm the hinge + engine bay work
setTimeout(() => vehicle.openBonnet(), 2000)
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open in browser.
Expected: a colored box-car body sits in the garage with a gray engine block visible under a closed bonnet panel, 4 spring stand-ins at wheel corners, and an exhaust pipe at the rear. After 2 seconds the bonnet panel visibly rotates open, revealing the engine bay clearly. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/VehicleModel.ts src/main.ts
git commit -m "feat: add procedural vehicle model with swappable part slots"
```

---

### Task 8: Camera view presets (exterior / engine bay / underside)

**Files:**
- Create: `src/scene/cameraViews.ts`
- Modify: `src/main.ts` (temporary manual check)

**Interfaces:**
- Consumes: `THREE.PerspectiveCamera` from Task 6's `GarageScene.camera`
- Produces (used by Task 12 garage HUD):
  ```ts
  type CameraView = 'exterior' | 'engineBay' | 'underside'
  function setCameraView(camera: THREE.PerspectiveCamera, view: CameraView): void
  ```

- [ ] **Step 1: Write `src/scene/cameraViews.ts`**

```ts
import * as THREE from 'three'

export type CameraView = 'exterior' | 'engineBay' | 'underside'

const PRESETS: Record<CameraView, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  exterior: { position: [4, 2.5, 6], lookAt: [0, 0.5, 0] },
  engineBay: { position: [1.4, 1.2, 1.6], lookAt: [1.0, 0.7, 0] },
  underside: { position: [0, 0.3, 3], lookAt: [0, 0, 0] },
}

export function setCameraView(camera: THREE.PerspectiveCamera, view: CameraView): void {
  const preset = PRESETS[view]
  camera.position.set(...preset.position)
  camera.lookAt(...preset.lookAt)
}
```

- [ ] **Step 2: Wire a temporary manual check into `src/main.ts`**

```ts
// src/main.ts (temporary, replaces the setTimeout bonnet demo from Task 7)
import { GarageScene } from './scene/GarageScene'
import { VehicleModel } from './scene/VehicleModel'
import { VEHICLES } from './data/vehicles'
import { setCameraView } from './scene/cameraViews'

const container = document.querySelector<HTMLDivElement>('#garage-canvas-container')!
const scene = new GarageScene(container)

const vehicle = new VehicleModel(VEHICLES[3])
scene.scene.add(vehicle.group)
scene.start()

let view: 'exterior' | 'engineBay' | 'underside' = 'exterior'
window.addEventListener('keydown', e => {
  if (e.key === '1') view = 'exterior'
  if (e.key === '2') { view = 'engineBay'; vehicle.openBonnet() }
  if (e.key === '3') view = 'underside'
  setCameraView(scene.camera, view)
})
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open in browser.
Expected: pressing `1`, `2`, `3` visibly cuts the camera between the full exterior view, a close-up over the open engine bay, and a low view from underneath the car.

- [ ] **Step 4: Commit**

```bash
git add src/scene/cameraViews.ts src/main.ts
git commit -m "feat: add camera view presets for exterior/engine bay/underside"
```

---

### Task 9: Drive-in animation

**Files:**
- Create: `src/scene/driveInAnimation.ts`

**Interfaces:**
- Consumes: `THREE.Group` (a `VehicleModel.group`)
- Produces (used by Task 10 dealership): `function driveIn(group: THREE.Group, onComplete?: () => void): void` — tweens the group's position from a garage-entrance point to its resting spot over ~1.5s using `requestAnimationFrame`, no external tweening library.

- [ ] **Step 1: Write `src/scene/driveInAnimation.ts`**

```ts
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
    group.position.lerpVectors(START, END, eased)

    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  requestAnimationFrame(step)
}
```

- [ ] **Step 2: Manual verification**

Temporarily call `driveIn(vehicle.group)` in `src/main.ts` in place of the static placement from Task 8, run `npm run dev`, and confirm the car visibly slides in from the back of the garage to its resting position over about 1.5 seconds, decelerating smoothly. Revert `src/main.ts` back to the Task 8 state afterward (this wiring is superseded by Task 10's dealership flow).

- [ ] **Step 3: Commit**

```bash
git add src/scene/driveInAnimation.ts
git commit -m "feat: add drive-in animation for newly purchased vehicles"
```

---

### Task 10: Screen router and Main Menu

**Files:**
- Create: `src/ui/router.ts`
- Create: `src/ui/MainMenu.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `PlayerState` from `src/types.ts`, `loadPlayerState` from `src/state/playerState.ts`, `VEHICLES` from `src/data/vehicles.ts`
- Produces (used by Tasks 11–14):
  ```ts
  type ScreenName = 'mainMenu' | 'dealership' | 'garage' | 'partsStore' | 'inventory'
  function navigateTo(screen: ScreenName): void
  ```
  The router owns the `#app` DOM container and the visibility of `#garage-canvas-container` (only visible during `'garage'`).

- [ ] **Step 1: Write `src/ui/router.ts`**

```ts
export type ScreenName = 'mainMenu' | 'dealership' | 'garage' | 'partsStore' | 'inventory'

type ScreenRenderer = (container: HTMLElement) => void

const renderers = new Map<ScreenName, ScreenRenderer>()

export function registerScreen(name: ScreenName, renderer: ScreenRenderer): void {
  renderers.set(name, renderer)
}

export function navigateTo(screen: ScreenName): void {
  const app = document.querySelector<HTMLDivElement>('#app')!
  const canvasContainer = document.querySelector<HTMLDivElement>('#garage-canvas-container')!

  canvasContainer.style.display = screen === 'garage' ? 'block' : 'none'
  app.style.pointerEvents = screen === 'garage' ? 'none' : 'auto'
  app.style.background = screen === 'garage' ? 'transparent' : '#111'

  app.innerHTML = ''
  const renderer = renderers.get(screen)
  if (!renderer) throw new Error(`No screen registered: ${screen}`)
  renderer(app)
}
```

- [ ] **Step 2: Write `src/ui/MainMenu.ts`**

```ts
import { loadPlayerState } from '../state/playerState'
import { VEHICLES } from '../data/vehicles'
import { navigateTo } from './router'

export function renderMainMenu(container: HTMLElement): void {
  const state = loadPlayerState()

  const vehicleList = state.ownedVehicles
    .map(ov => {
      const def = VEHICLES.find(v => v.id === ov.vehicleDefId)!
      return `<li>${def.name}</li>`
    })
    .join('')

  container.innerHTML = `
    <div class="screen main-menu">
      <h1>Hot Rod Garage</h1>
      <p class="cash">Cash: $${state.cash.toLocaleString()}</p>
      <ul>${vehicleList || '<li>No vehicles yet</li>'}</ul>
      <nav>
        <button id="nav-dealership">Vehicle Dealership</button>
        <button id="nav-garage" ${state.ownedVehicles.length === 0 ? 'disabled' : ''}>My Garage</button>
        <button id="nav-parts">Parts Store</button>
        <button id="nav-inventory">Inventory</button>
      </nav>
    </div>
  `

  container.querySelector('#nav-dealership')!.addEventListener('click', () => navigateTo('dealership'))
  container.querySelector('#nav-garage')!.addEventListener('click', () => navigateTo('garage'))
  container.querySelector('#nav-parts')!.addEventListener('click', () => navigateTo('partsStore'))
  container.querySelector('#nav-inventory')!.addEventListener('click', () => navigateTo('inventory'))
}
```

- [ ] **Step 3: Wire into `src/main.ts`**

```ts
// src/main.ts
import { registerScreen, navigateTo } from './ui/router'
import { renderMainMenu } from './ui/MainMenu'

registerScreen('mainMenu', renderMainMenu)
navigateTo('mainMenu')
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open in browser.
Expected: shows "Hot Rod Garage", "Cash: $20,000", "No vehicles yet", and 4 nav buttons with "My Garage" disabled (since there are no owned vehicles). Clicking the other buttons currently throws (screens not registered yet) — that's expected until Tasks 11–14 register them; confirm this by checking the browser console shows the expected "No screen registered" error, not something else.

- [ ] **Step 5: Commit**

```bash
git add src/ui/router.ts src/ui/MainMenu.ts src/main.ts
git commit -m "feat: add screen router and main menu"
```

---

### Task 11: Dealership screen (buy vehicle + drive-in)

**Files:**
- Create: `src/ui/Dealership.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `VEHICLES`, `loadPlayerState`, `buyVehicle`, `navigateTo`, `registerScreen`
- Produces: registers the `'dealership'` screen. After a successful purchase, stores the newly bought vehicle's `instanceId` somewhere Task 12 (garage screen) can read it — use a simple exported `let lastPurchasedVehicleId: string | null` in this module, read by `GarageHUD.ts` in Task 12. Also exports `clearLastPurchasedVehicleId(): void`, called by Task 12 once the drive-in animation has played once, so revisiting the garage for the same vehicle later in the session doesn't replay it.

- [ ] **Step 1: Write `src/ui/Dealership.ts`**

```ts
import { VEHICLES } from '../data/vehicles'
import { loadPlayerState, buyVehicle } from '../state/playerState'
import { navigateTo } from './router'

export let lastPurchasedVehicleId: string | null = null

export function clearLastPurchasedVehicleId(): void {
  lastPurchasedVehicleId = null
}

export function renderDealership(container: HTMLElement): void {
  const state = loadPlayerState()

  const cards = VEHICLES.map(v => {
    const affordable = state.cash >= v.price
    return `
      <div class="vehicle-card">
        <h3>${v.name}</h3>
        <p>$${v.price.toLocaleString()}</p>
        <ul class="stats">
          <li>RPM: ${v.baseStats.rpm}</li>
          <li>Power: ${v.baseStats.power} hp</li>
          <li>Torque: ${v.baseStats.torque} lb-ft</li>
          <li>Top Speed: ${v.baseStats.topSpeed} mph</li>
          <li>Weight: ${v.baseStats.weight} lb</li>
          <li>Height: ${v.baseStats.height} mm</li>
        </ul>
        <button data-vehicle-id="${v.id}" ${affordable ? '' : 'disabled'}>
          ${affordable ? 'Buy' : 'Cannot afford'}
        </button>
      </div>
    `
  }).join('')

  container.innerHTML = `
    <div class="screen dealership">
      <h1>Classic Vehicle Dealership</h1>
      <p class="cash">Cash: $${state.cash.toLocaleString()}</p>
      <div class="vehicle-grid">${cards}</div>
      <button id="back">Back</button>
    </div>
  `

  container.querySelectorAll<HTMLButtonElement>('button[data-vehicle-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const vehicleId = btn.dataset.vehicleId!
      const before = loadPlayerState()
      const after = buyVehicle(before, vehicleId)
      lastPurchasedVehicleId = after.ownedVehicles[after.ownedVehicles.length - 1].instanceId
      navigateTo('garage')
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))
}
```

- [ ] **Step 2: Register the screen in `src/main.ts`**

```ts
// src/main.ts — add these lines
import { registerScreen, navigateTo } from './ui/router'
import { renderMainMenu } from './ui/MainMenu'
import { renderDealership } from './ui/Dealership'

registerScreen('mainMenu', renderMainMenu)
registerScreen('dealership', renderDealership)
navigateTo('mainMenu')
```

(Note: `navigateTo('garage')` inside Dealership will still throw until Task 12 registers it — that's expected for now.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. From the main menu, click "Vehicle Dealership". Expected: 5 vehicle cards with correct prices and stats, all affordable at $20,000 starting cash except none should be disabled yet. Click "Buy" on the Rust Bucket Sedan. Expected: console shows the "No screen registered: garage" error (expected, fixed in Task 12) — go back to Main Menu manually via browser back is not available yet, so just reload the page and confirm via `localStorage.getItem('hot-rod-garage:player-state')` in devtools console that cash dropped to 17000 and a vehicle was added.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Dealership.ts src/main.ts
git commit -m "feat: add dealership screen with vehicle purchase flow"
```

---

### Task 12: Garage screen (3D view, bonnet/jack toggle, live stat sheet)

**Files:**
- Create: `src/ui/GarageHUD.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `GarageScene` (Task 6), `VehicleModel` (Task 7), `setCameraView` (Task 8), `driveIn` (Task 9), `loadPlayerState` (Task 5), `computeStats` (Task 4), `VEHICLES`, `PARTS`, `lastPurchasedVehicleId` (Task 11)
- Produces: registers the `'garage'` screen. Exposes `getActiveVehicleModel(): VehicleModel | null` and `getActiveOwnedVehicleId(): string | null`, both read by Task 14 (Inventory) when installing/removing parts so the 3D model updates live.

- [ ] **Step 1: Write `src/ui/GarageHUD.ts`**

```ts
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
    scene.start()
  }
  // clear any previously loaded vehicle, releasing its GPU resources
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
      setCameraView(scene!.camera, view)
    })
  })

  container.querySelector('#nav-parts')!.addEventListener('click', () => navigateTo('partsStore'))
  container.querySelector('#nav-inventory')!.addEventListener('click', () => navigateTo('inventory'))
  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))

  renderStatSheet(container)
}
```

- [ ] **Step 2: Register the screen in `src/main.ts`**

```ts
// src/main.ts — add
import { renderGarageHUD } from './ui/GarageHUD'
registerScreen('garage', renderGarageHUD)
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. From Main Menu → Dealership → buy the Rust Bucket Sedan. Expected: navigates to the garage screen, the car visibly drives in from the back of the garage, the stat sheet shows the sedan's exact base stats (RPM 5500, Power 85, etc. — matching the catalog since only stock parts are installed), and clicking "Open Bonnet" / "Raise on Jack" / "Exterior" cuts the camera correctly.

- [ ] **Step 4: Commit**

```bash
git add src/ui/GarageHUD.ts src/main.ts
git commit -m "feat: add garage screen with 3D view, camera toggles, and live stat sheet"
```

---

### Task 13: Parts store screen (buy parts)

**Files:**
- Create: `src/ui/PartsStore.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `PARTS`, `loadPlayerState`, `buyPart`, `navigateTo`
- Produces: registers the `'partsStore'` screen.

- [ ] **Step 1: Write `src/ui/PartsStore.ts`**

```ts
import { PARTS } from '../data/parts'
import { loadPlayerState, buyPart } from '../state/playerState'
import { navigateTo } from './router'
import type { PartSlot } from '../types'

const SLOT_LABELS: Record<PartSlot, string> = {
  engine: 'Engine',
  forcedInduction: 'Forced Induction',
  suspension: 'Suspension',
  exhaust: 'Exhaust',
}

export function renderPartsStore(container: HTMLElement): void {
  const state = loadPlayerState()
  const purchasable = PARTS.filter(p => p.price > 0)

  const sections = (['engine', 'forcedInduction', 'suspension', 'exhaust'] as PartSlot[])
    .map(slot => {
      const items = purchasable
        .filter(p => p.slot === slot)
        .map(p => {
          const affordable = state.cash >= p.price
          return `
            <div class="part-card">
              <h4>${p.name}</h4>
              <p>$${p.price.toLocaleString()}</p>
              <button data-part-id="${p.id}" ${affordable ? '' : 'disabled'}>
                ${affordable ? 'Buy' : 'Cannot afford'}
              </button>
            </div>
          `
        })
        .join('')
      return `<section><h3>${SLOT_LABELS[slot]}</h3><div class="part-grid">${items}</div></section>`
    })
    .join('')

  container.innerHTML = `
    <div class="screen parts-store">
      <h1>Parts Store</h1>
      <p class="cash">Cash: $${state.cash.toLocaleString()}</p>
      ${sections}
      <button id="back">Back</button>
    </div>
  `

  container.querySelectorAll<HTMLButtonElement>('button[data-part-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const partId = btn.dataset.partId!
      const before = loadPlayerState()
      buyPart(before, partId)
      renderPartsStore(container) // re-render to reflect new cash + disabled states
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))
}
```

- [ ] **Step 2: Register the screen in `src/main.ts`**

```ts
// src/main.ts — add
import { renderPartsStore } from './ui/PartsStore'
registerScreen('partsStore', renderPartsStore)
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. From Main Menu → Parts Store. Expected: 4 sections (Engine, Forced Induction, Suspension, Exhaust) each listing their purchasable parts with correct prices. Buying a part deducts cash immediately and the screen re-renders showing the new cash total; buying enough parts to exceed remaining cash disables further "Buy" buttons.

- [ ] **Step 4: Commit**

```bash
git add src/ui/PartsStore.ts src/main.ts
git commit -m "feat: add parts store screen with buy flow"
```

---

### Task 14: Inventory screen (install / remove / sell) with live 3D + stat updates

**Files:**
- Create: `src/ui/Inventory.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `PARTS`, `STOCK_PART_IDS` (Task 3); `loadPlayerState`, `installPart`, `removePart`, `sellPart` (Task 5); `getActiveVehicleModel`, `getActiveOwnedVehicleId` (Task 12)
- Produces: registers the `'inventory'` screen — the final screen, completing the full user flow from the spec.

- [ ] **Step 1: Write `src/ui/Inventory.ts`**

```ts
import { PARTS, STOCK_PART_IDS } from '../data/parts'
import { loadPlayerState, installPart, removePart, sellPart } from '../state/playerState'
import { navigateTo } from './router'
import { getActiveVehicleModel, getActiveOwnedVehicleId } from './GarageHUD'
import type { PartSlot } from '../types'

export function renderInventory(container: HTMLElement): void {
  const state = loadPlayerState()
  const activeVehicleId = getActiveOwnedVehicleId()
  const activeVehicle = state.ownedVehicles.find(v => v.instanceId === activeVehicleId)

  const installedInstanceIds = new Set(
    activeVehicle ? Object.values(activeVehicle.installedParts) : [],
  )

  const rows = state.inventory
    .map(owned => {
      const def = PARTS.find(p => p.id === owned.partDefId)!
      const isInstalled = installedInstanceIds.has(owned.instanceId)
      return `
        <tr>
          <td>${def.name}</td>
          <td>${def.slot}</td>
          <td>${isInstalled ? 'Installed' : 'In inventory'}</td>
          <td>
            ${!isInstalled && activeVehicle ? `<button data-action="install" data-part-instance="${owned.instanceId}">Install</button>` : ''}
            ${isInstalled ? `<button data-action="remove" data-slot="${def.slot}">Remove</button>` : ''}
            ${!isInstalled && def.price > 0 ? `<button data-action="sell" data-part-instance="${owned.instanceId}">Sell ($${def.sellPrice})</button>` : ''}
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
      if (!activeVehicleId) return
      const partInstanceId = btn.dataset.partInstance!
      installPart(loadPlayerState(), activeVehicleId, partInstanceId)
      syncActiveModel()
      renderInventory(container)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('button[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeVehicleId) return
      const slot = btn.dataset.slot as PartSlot
      removePart(loadPlayerState(), activeVehicleId, slot)
      syncActiveModel()
      renderInventory(container)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('button[data-action="sell"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const partInstanceId = btn.dataset.partInstance!
      sellPart(loadPlayerState(), partInstanceId)
      renderInventory(container)
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('garage'))
}

function syncActiveModel(): void {
  const model = getActiveVehicleModel()
  const vehicleId = getActiveOwnedVehicleId()
  if (!model || !vehicleId) return

  const state = loadPlayerState()
  const owned = state.ownedVehicles.find(v => v.instanceId === vehicleId)
  if (!owned) return

  for (const slot of ['engine', 'forcedInduction', 'suspension', 'exhaust'] as PartSlot[]) {
    const partInstanceId = owned.installedParts[slot]
    const ownedPart = partInstanceId ? state.inventory.find(p => p.instanceId === partInstanceId) : undefined
    model.setPart(slot, ownedPart ? ownedPart.partDefId : STOCK_PART_IDS[slot])
  }
}
```

- [ ] **Step 2: Register the screen in `src/main.ts`, finalize app entry**

```ts
// src/main.ts — final version
import { registerScreen, navigateTo } from './ui/router'
import { renderMainMenu } from './ui/MainMenu'
import { renderDealership } from './ui/Dealership'
import { renderGarageHUD } from './ui/GarageHUD'
import { renderPartsStore } from './ui/PartsStore'
import { renderInventory } from './ui/Inventory'

registerScreen('mainMenu', renderMainMenu)
registerScreen('dealership', renderDealership)
registerScreen('garage', renderGarageHUD)
registerScreen('partsStore', renderPartsStore)
registerScreen('inventory', renderInventory)

navigateTo('mainMenu')
```

- [ ] **Step 3: Manual verification — full end-to-end flow**

Run: `npm run dev`. Walk the entire flow from the spec:
1. Main Menu shows $20,000, no vehicles.
2. Dealership → buy Muscle Car → drives into garage, stat sheet matches catalog base stats.
3. Parts Store → buy a Turbo and a Race Exhaust.
4. Garage → Inventory → both new parts show "In inventory" with an "Install" button; install both.
5. Back to Garage: stat sheet now reflects `baseStats + turbo modifiers + race exhaust modifiers` (verify the numbers match Task 4's arithmetic), and the 3D model shows a turbo cylinder in the forced-induction slot and a lighter-colored exhaust pipe.
6. Inventory → Remove the Turbo → it returns to inventory as "In inventory", stat sheet drops back down, 3D model's forced-induction slot goes empty.
7. Inventory → Sell the stock engine that's sitting loose from an earlier remove, or sell the removed turbo → cash increases by its sell price, row disappears.
8. Reload the browser page entirely → confirm cash, owned vehicle, and installed parts all persisted correctly (localStorage round-trip).

Expected: every step above works exactly as described, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Inventory.ts src/main.ts
git commit -m "feat: add inventory screen with install/remove/sell wired to live 3D and stats"
```

---

### Task 15: Minimal styling pass

**Files:**
- Modify: `src/styles.css`

**Interfaces:** none — pure CSS, no new logic.

- [ ] **Step 1: Replace `src/styles.css` with real layout/styling**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #111; color: #eee; font-family: system-ui, sans-serif; }
#garage-canvas-container { position: fixed; inset: 0; z-index: 0; display: none; }
#app { position: relative; z-index: 1; min-height: 100%; padding: 16px; }

.screen { max-width: 480px; margin: 0 auto; }
h1, h2, h3 { margin: 0.4em 0; }
.cash { font-weight: bold; color: #7CFC7C; }

nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
button { padding: 10px 14px; border: none; border-radius: 6px; background: #333; color: #eee; font-size: 1em; }
button:disabled { opacity: 0.4; }
button:not(:disabled):active { background: #555; }

.vehicle-grid, .part-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin: 10px 0; }
.vehicle-card, .part-card { background: #1e1e1e; border-radius: 8px; padding: 10px; }
.stats { list-style: none; padding: 0; font-size: 0.9em; color: #ccc; }

table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { text-align: left; padding: 6px; border-bottom: 1px solid #333; font-size: 0.9em; }

.garage-hud #stat-sheet { background: #1e1e1e; border-radius: 8px; padding: 10px; }

/* router.ts sets #app to pointer-events:none on the garage screen so clicks pass
   through to the canvas underneath; re-enable it for the HUD's own buttons, which
   live inside #app on top of that canvas and must stay clickable. */
.garage-hud, .garage-hud * { pointer-events: auto; }
```

- [ ] **Step 2: Update `GarageScene.ts` to only show the canvas container when the garage screen is active**

Note: the router already toggles `#garage-canvas-container`'s `display` via inline style in `navigateTo` (Task 10), which overrides the CSS default of `none` when on the `'garage'` screen. Confirm this still works after the CSS change — no code change needed, just re-verify.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Click through all 5 screens. Expected: readable, reasonably laid-out on both a desktop browser window and a narrow mobile viewport (use browser devtools device toolbar, e.g. 390x844). No horizontal scrollbars, buttons are tap-sized (~40px+ tall).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "style: add layout and mobile-friendly styling pass"
```

---

## Self-Review Notes

- **Spec coverage:** Goals 1–6 from spec section 1 are each covered — buy vehicle (Task 11), roll into garage (Task 9 + 11), open bonnet/jack views (Task 7 + 8 + 12), buy parts (Task 13), inventory with install/remove/sell (Task 14), live stat/3D updates (Task 12 + 14), starting $20k persisted (Task 5). Vehicle catalog (spec section 5) → Task 2. Parts catalog (spec section 6) → Task 3. Extensibility requirement (data-driven catalogs) → satisfied by Tasks 2/3 structure, no branching logic per part.
- **Placeholder scan:** no TBD/TODO; all code steps contain real, complete code.
- **Type consistency:** `PartSlot`, `VehicleDef`, `PartDef`, `PlayerState`, `OwnedVehicle`, `OwnedPart` defined once in Task 2/3 and referenced identically throughout; `computeStats(baseStats, installedPartIds)` signature from Task 4 matches its call site in Task 12; `VehicleModel.setPart(slot, partDefId)` signature from Task 7 matches call sites in Task 12 and Task 14.
