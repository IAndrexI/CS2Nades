import { createRouter, createWebHistory } from 'vue-router'
import MinimapView from '../views/MinimapView.vue'
import StratbookView from '../views/StratbookView.vue'
import TacticsBoardView from '../views/TacticsBoardView.vue'
import LibraryView from '../views/LibraryView.vue'
import MyLineupsView from '../views/MyLineupsView.vue'
import AdminView from '../views/AdminView.vue'

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
  },
  {
    path: '/my-lineups',
    name: 'my-lineups',
    component: MyLineupsView
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
