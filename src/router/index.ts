import { createRouter, createWebHistory } from 'vue-router'
import MinimapView from '../views/MinimapView.vue'
import StratbookView from '../views/StratbookView.vue'
import TacticsBoardView from '../views/TacticsBoardView.vue'
import LibraryView from '../views/LibraryView.vue'

const routes = [
  {
    path: '/',
    name: 'minimap',
    component: MinimapView
  },
  {
    path: '/strats',
    name: 'strats',
    component: StratbookView
  },
  {
    path: '/tactics',
    name: 'tactics',
    component: TacticsBoardView
  },
  {
    path: '/library',
    name: 'library',
    component: LibraryView
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
