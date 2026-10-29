import { stopGarageScene } from './GarageHUD'

export type ScreenName = 'mainMenu' | 'dealership' | 'garage' | 'partsStore' | 'inventory'

type ScreenRenderer = (container: HTMLElement) => void

const renderers = new Map<ScreenName, ScreenRenderer>()

export function registerScreen(name: ScreenName, renderer: ScreenRenderer): void {
  renderers.set(name, renderer)
}

export function navigateTo(screen: ScreenName): void {
  const app = document.querySelector<HTMLDivElement>('#app')!
  const canvasContainer = document.querySelector<HTMLDivElement>('#garage-canvas-container')!

  // Hiding the canvas does not pause requestAnimationFrame, so the render loop
  // must be stopped explicitly on every non-garage screen. renderGarageHUD
  // re-starts it when the garage is entered again.
  if (screen !== 'garage') stopGarageScene()

  canvasContainer.style.display = screen === 'garage' ? 'block' : 'none'
  app.style.pointerEvents = screen === 'garage' ? 'none' : 'auto'
  app.style.background = screen === 'garage' ? 'transparent' : '#111'

  app.innerHTML = ''
  const renderer = renderers.get(screen)
  if (!renderer) throw new Error(`No screen registered: ${screen}`)
  renderer(app)
}
