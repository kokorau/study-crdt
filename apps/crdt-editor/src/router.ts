import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import TextDiff from './pages/TextDiff.vue';
import NodeDiff from './pages/NodeDiff.vue';
import TextEditor from './pages/TextEditor.vue';
import TextEditorDebug from './pages/TextEditorDebug.vue';

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
  {
    path: '/node-diff',
    name: 'NodeDiff',
    component: NodeDiff,
  },
  {
    path: '/text-editor',
    name: 'TextEditor',
    component: TextEditor,
  },
  {
    path: '/text-editor-debug',
    name: 'TextEditorDebug',
    component: TextEditorDebug,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;