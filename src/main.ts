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
