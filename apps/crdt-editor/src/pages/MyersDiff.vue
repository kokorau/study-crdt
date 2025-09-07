<script setup lang="ts">
import { computed, ref } from "vue";
import VisualizeMyersDiff from "../components/MyersDiff/VisualizeMyersDiff.vue";
import { $StringDiff } from "@study-crdt/myers-diff";

const before = ref("kitten");
const after = ref("sitting");

const patch = computed(() => {
  try {
    return $StringDiff.createFromDiff(before.value, after.value);
  } catch (error) {
    console.error("Error creating patch:", error);
    return $StringDiff.create({
      baseVersion: before.value,
      spans: [],
    });
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div
      class="container mx-auto py-8 px-4 flex flex-col items-stretch justify-start"
    >
      <div class="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">
          Myers Diff Algorithm Visualization
        </h1>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              for="before"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Before (Original Text)
            </label>
            <input
              id="before"
              v-model="before"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Enter original text..."
            />
          </div>
          <div>
            <label
              for="after"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              After (Target Text)
            </label>
            <input
              id="after"
              v-model="after"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Enter target text..."
            />
          </div>
        </div>

        <!-- Quick Examples -->
        <div class="mt-4">
          <p class="text-sm text-gray-600 mb-2">Quick examples:</p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="
                () => {
                  before = 'kitten';
                  after = 'sitting';
                }
              "
              class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              kitten → sitting
            </button>
            <button
              @click="
                () => {
                  before = 'cat';
                  after = 'bat';
                }
              "
              class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              cat → bat
            </button>
            <button
              @click="
                () => {
                  before = 'hello';
                  after = 'hello world';
                }
              "
              class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              hello → hello world
            </button>
            <button
              @click="
                () => {
                  before = 'abcd';
                  after = 'aXYcd';
                }
              "
              class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
            >
              abcd → aXYcd
            </button>
          </div>
        </div>
      </div>

      <VisualizeMyersDiff :patch="patch" />
    </div>
  </div>
</template>

<style scoped></style>