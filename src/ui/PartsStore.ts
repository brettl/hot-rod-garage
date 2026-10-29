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
      try {
        buyPart(loadPlayerState(), partId)
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error))
        return
      }
      renderPartsStore(container) // re-render to reflect new cash + disabled states
    })
  })

  container.querySelector('#back')!.addEventListener('click', () => navigateTo('mainMenu'))
}
