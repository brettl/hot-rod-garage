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
