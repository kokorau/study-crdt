<template>
  <div class="w-64 bg-white shadow-sm border-r border-gray-200 h-screen fixed left-0 top-0 z-10">
    <div class="p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-6">CRDT Editor</h2>
      <nav class="space-y-2">
        <router-link
          to="/"
          class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="$route.path === '/' 
            ? 'bg-blue-100 text-blue-900' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z"/>
          </svg>
          Home
        </router-link>
        
        <router-link
          to="/myers-diff"
          class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="$route.path === '/myers-diff' 
            ? 'bg-blue-100 text-blue-900' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z"/>
          </svg>
          Myers Diff
        </router-link>
      </nav>
    </div>
    
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
      <p class="text-xs text-gray-500 text-center">
        CRDT Study Project
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const $route = useRoute();
</script>

<style scoped></style>