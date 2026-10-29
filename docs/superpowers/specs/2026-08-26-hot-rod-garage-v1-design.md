# Hot Rod Garage — V1 Design

**Status:** Approved for planning
**Date:** 2026-08-26

## 1. Purpose & Scope

A mobile-web browser game inspired by *Street Rod*: buy classic vehicles from
a fake online marketplace, watch them roll into your garage, inspect them in
3D (bonnet up / on the jack), buy performance parts from a second fake
marketplace, and swap parts in and out to change the car's stats.

This is a **portfolio piece**. V1 is a garage/customization simulator only —
there is **no driving, racing, or physics simulation** in this phase. Stats
are tracked and displayed, not exercised. That is an explicit, deliberate
cut, likely to become its own future project phase.

### Goals for V1
1. Buy 1 of 5 base vehicles from a fake dealership site; watch it drive into the garage.
2. View the vehicle in 3D; open the bonnet (camera cut to engine bay) and raise it on a jack (camera cut to underside).
3. Buy parts from a fake parts store across 4 slots (Engine, Forced Induction, Suspension, Exhaust).
4. Maintain an inventory of owned parts (installed and loose); install, remove, and sell parts.
5. See the 3D model and the stat sheet update live as parts are installed/removed.
6. Track cash, starting at $20,000, persisted across sessions.

### Explicitly out of scope for V1
- Driving, racing, physics, or any track/test mode.
- Real 3D model assets (Blender/Sketchfab/etc.) — vehicles and parts are built from primitive Three.js geometry.
- Native app packaging (Capacitor/Cordova) — ships as a responsive mobile-web page for now, but nothing in the architecture should block wrapping it later.
- Multiplayer, accounts, or server-side anything — fully client-side, localStorage only.
- Handling/grip stats — only the 6 listed stats exist (RPM, Power, Torque, Top Speed, Weight, Height).

## 2. Tech Stack

- **Vite + TypeScript + vanilla Three.js** for the 3D garage scene.
- Plain HTML/CSS/DOM overlays (no UI framework) for all 2D screens: dealership, parts store, inventory, garage HUD, main menu.
- **localStorage** for save data — auto-saves player state, no accounts/login.
- No test framework required; manual testing in desktop browser + mobile emulation/device, with a handful of plain unit tests for pure logic (stat math, buy/sell money math) since that's cheap to isolate and easy to get wrong.

## 3. Screens & User Flow

```
Main Menu (cash, owned vehicles)
   -> Dealership (fake website) -> buy vehicle -> drive-in animation -> Garage View
   -> Garage View (3D scene)
        - 3 fixed camera presets, switched via buttons (no free drag/orbit in V1 --
          see "Camera + state toggle" decision, section 7)
        - toggle bonnet -> camera cut to engine bay
        - toggle jack -> camera cut to underside
        - shows currently installed parts + live stat sheet
   -> Parts Store (fake website) -> buy part -> added to Inventory
   -> Inventory -> install part onto active vehicle (updates 3D model + stats)
               -> remove part from vehicle -> back to Inventory
               -> sell part from Inventory -> cash += resale price
```

Removed parts (including the original stock parts a car comes with) always
go to Inventory as loose items — they can be reinstalled later (on this car
or, if slot-compatible, another owned car) or sold back for a reduced price.

## 4. Data Model

Static catalogs (content, not save data):

```ts
interface VehicleDef {
  id: string
  name: string
  price: number
  baseStats: Stats
  // procedural geometry config: dimensions, colors, bonnet hinge point, etc.
}

type PartSlot = 'engine' | 'forcedInduction' | 'suspension' | 'exhaust'

interface PartDef {
  id: string
  slot: PartSlot
  name: string
  price: number          // 0 for stock parts (not purchasable, just what a car ships with)
  sellPrice: number       // resale value, < price
  statModifiers: Partial<Stats>  // additive deltas applied to vehicle baseStats
}

interface Stats {
  rpm: number
  power: number     // hp
  torque: number    // lb-ft
  topSpeed: number  // mph
  weight: number    // lb
  height: number    // mm
}
```

Save data (persisted to localStorage):

```ts
interface PlayerState {
  cash: number
  ownedVehicles: OwnedVehicle[]
  inventory: OwnedPart[]   // every owned part, installed or loose -- whether a given
                           // part is currently installed is derived by checking every
                           // vehicle's installedParts, not by its presence here
}

interface OwnedVehicle {
  vehicleDefId: string
  instanceId: string
  installedParts: Partial<Record<PartSlot, string /* OwnedPart instanceId */>>
}

interface OwnedPart {
  instanceId: string
  partDefId: string
}
```

Both catalogs (`VehicleDef[]`, `PartDef[]`) are plain data (TS objects or
JSON), not code — adding a new part (e.g. an intercooler later) or a new
vehicle means adding a catalog entry, not touching game logic. This was a
specific ask: keep the system extensible without a rewrite.

Displayed stats for a vehicle = `baseStats + sum(statModifiers for each installed part)`.

## 5. Vehicle Catalog (5 base vehicles)

| Vehicle | Price | RPM | Power | Torque | Top Speed | Weight | Height |
|---|---|---|---|---|---|---|---|
| Rust Bucket Sedan | $3,000 | 5,500 | 85 hp | 130 lb-ft | 85 mph | 3,100 lb | 1,450 mm |
| Farm Truck | $5,500 | 5,000 | 110 hp | 180 lb-ft | 90 mph | 3,600 lb | 1,650 mm |
| Classic Coupe | $9,000 | 6,000 | 140 hp | 150 lb-ft | 105 mph | 2,900 lb | 1,350 mm |
| Muscle Car | $14,000 | 6,500 | 220 hp | 260 lb-ft | 125 mph | 3,400 lb | 1,300 mm |
| Roadster GT | $18,500 | 7,200 | 260 hp | 220 lb-ft | 140 mph | 2,600 lb | 1,150 mm |

Deliberately not a straight line: the truck trades top speed for
torque/practicality; the roadster trades affordability and torque for
outright speed. The most expensive car costs nearly the entire starting
$20,000, forcing an early real choice.

## 6. Parts Catalog (4 slots, 14 PartDefs)

Every vehicle ships with a **Stock** part (price $0, not purchasable) already
installed in each of the 4 slots.

**Engine** — replaces the whole engine
| Part | Price | Sell | Effect |
|---|---|---|---|
| Stock | — | — | baseline |
| Performance Engine | $2,500 | $1,250 | +power/torque/RPM, +weight |
| Race Engine | $6,000 | $3,000 | big +power/torque/RPM, +more weight |

**Forced Induction** — bolts onto whatever engine is installed
| Part | Price | Sell | Effect |
|---|---|---|---|
| None (stock) | — | — | no change |
| Turbo | $1,800 | $900 | big +top speed/power, slight +torque, light +weight (top-end biased) |
| Supercharger | $3,200 | $1,600 | big +torque, solid +power, less top-speed gain, heavier (low-end biased) |

**Suspension** — distinct styles, not tiers
| Part | Price | Sell | Effect |
|---|---|---|---|
| Stock | — | — | baseline |
| Hard (Track) | $600 | $300 | −height, −weight, stiff |
| Soft (Cruiser) | $400 | $200 | +height, +weight |
| Sport | $900 | $450 | −height (moderate), −weight |
| Rally | $1,100 | $550 | +height, −weight (reinforced but lightweight) |

**Exhaust** — torque vs. top-end trade-off
| Part | Price | Sell | Effect |
|---|---|---|---|
| Stock | — | — | baseline |
| Torque Exhaust | $500 | $250 | +torque, +weight slightly, minimal top-speed change |
| Race Exhaust | $1,200 | $600 | +top speed, +power, −torque slightly, −weight |

Future additions (intercooler, more engine tiers, etc.) slot in as new
`PartDef` catalog entries — no architectural change needed.

## 7. 3D Scene & Assets

- All vehicles and parts are **procedural primitive geometry** (boxes,
  cylinders, simple shapes) composed in Three.js code — no external model
  files (GLTF etc.) in V1.
- Each vehicle is a `Group` with a hinged bonnet sub-group (rotates open on
  toggle) and swappable child meshes per slot (engine, forced induction,
  suspension, exhaust) that are shown/hidden based on which `PartDef` is
  installed.
- Camera has 3 presets: exterior orbit (default), engine bay (bonnet open),
  underside (jacked up). Toggling bonnet/jack plays a short camera
  transition, not a physically simulated hinge/jack — this was chosen
  explicitly to avoid building drag/physics interactions for V1.
- "Roll into garage" on purchase is a simple scripted drive-in animation
  (position tween along a path into the garage bay), not physics-driven.

## 8. Economy & Persistence

- Start state: $20,000 cash, empty garage (no vehicle). First action is
  necessarily buying a car — this doubles as the tutorial moment.
- Buying anything (vehicle or part) checks `cash >= price`; buy button is
  disabled with a message if unaffordable.
- Selling a part refunds its `sellPrice` (50% of purchase price in the
  table above) and removes it from inventory.
- `PlayerState` auto-saves to localStorage on every mutation (buy, sell,
  install, remove). No manual save/load UI needed for V1.

## 9. Testing Approach

- No E2E/UI test framework for V1 — manual testing in desktop browser
  during development, plus mobile device/responsive emulation passes before
  calling a milestone done.
- Plain unit tests (Vitest, ships with Vite) for pure logic only: stat
  aggregation (`baseStats + modifiers`), buy/sell cash math, and
  install/remove inventory transitions. These are pure functions with no
  Three.js/DOM dependency, so they're cheap to isolate and worth covering.

## 10. Error Handling

All state is local, no network calls, so error handling is limited to:
- Insufficient funds on any purchase (disable action + message).
- Attempting to install a part into a slot that doesn't accept it (should be
  prevented by UI, not just caught at runtime — the inventory UI only offers
  compatible slots for a given part).
