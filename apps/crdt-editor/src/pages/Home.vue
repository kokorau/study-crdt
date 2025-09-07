<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto py-8 px-4">
      <div class="bg-white p-8 rounded-lg shadow-sm">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">
          CRDT Editor
        </h1>
        <p class="text-lg text-gray-600 mb-6">
          A study project exploring Conflict-free Replicated Data Types (CRDTs) and their applications.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 bg-blue-50 rounded-lg">
            <h2 class="text-xl font-semibold text-blue-800 mb-3">Features</h2>
            <ul class="space-y-2 text-blue-700">
              <li>• Text Diff Visualization (Myers Algorithm)</li>
              <li>• Node Structure Diff (HTML-like)</li>
              <li>• Real-time comparison</li>
              <li>• Interactive samples</li>
              <li>• Visual edit operation tracking</li>
            </ul>
          </div>
          
          <div class="p-6 bg-green-50 rounded-lg">
            <h2 class="text-xl font-semibold text-green-800 mb-3">Navigation</h2>
            <p class="text-green-700 mb-3">
              Explore different tools and visualizations:
            </p>
            <div class="space-y-2">
              <router-link 
                to="/text-diff" 
                class="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Try Text Diff →
              </router-link>
              <br>
              <router-link 
                to="/node-diff" 
                class="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Node Diff →
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home page content
</script>

<style scoped></style>