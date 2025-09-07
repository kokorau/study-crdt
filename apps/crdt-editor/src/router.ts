import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import TextDiff from './pages/TextDiff.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/text-diff',
    name: 'TextDiff',
    component: TextDiff,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;