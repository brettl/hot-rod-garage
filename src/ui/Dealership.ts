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
      try {
        const after = buyVehicle(loadPlayerState(), vehicleId)
        lastPurchasedVehicleId = after.ownedVehicles[after.ownedVehicles.length - 1].instanceId
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      navigateTo('garage')
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))
}
