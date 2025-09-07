import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import MyersDiff from './pages/MyersDiff.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/myers-diff',
    name: 'MyersDiff',
    component: MyersDiff,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;