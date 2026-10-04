import { createRouter, createWebHistory } from 'vue-router'
import DivineView from '../views/DivineView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'divine',
      component: DivineView,
    },
    {
      path: '/gua',
      name: 'reference',
      // 路由级代码分割：卦典数据较大，按需加载
      component: () => import('../views/ReferenceView.vue'),
    },
    {
      path: '/method',
      name: 'method',
      component: () => import('../views/MethodView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
