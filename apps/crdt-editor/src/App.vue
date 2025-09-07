<script setup lang="ts">
import Sidebar from "./components/Navigation/Sidebar.vue";
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Sidebar />
    <div class="ml-64">
      <router-view />
    </div>
  </div>
</template>

<style scoped></style>
