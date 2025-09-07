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
          to="/text-diff"
          class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="$route.path === '/text-diff' 
            ? 'bg-blue-100 text-blue-900' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Text Diff
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