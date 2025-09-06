<script lang="ts" setup>
import type { Patch } from "../../myers-diff";

interface Props {
  patch: Patch;
  intermediateResults: string[];
  getOperationDiff: (span: any, index: number) => string;
}

defineProps<Props>();
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(span, i) in patch.spans"
      :key="i"
      class="flex items-center gap-3 px-1 py-1 rounded-lg"
      :class="{
        'bg-green-50 border border-green-200': span.type === 'retain',
        'bg-red-50 border border-red-200': span.type === 'delete',
        'bg-blue-50 border border-blue-200': span.type === 'insert',
      }"
    >
      <div
        class="font-mono text-sm px-2 py-1 rounded"
        :class="{
          'bg-green-200 text-green-800': span.type === 'retain',
          'bg-red-200 text-red-800': span.type === 'delete',
          'bg-blue-200 text-blue-800': span.type === 'insert',
        }"
      >
        {{ span.type }}
      </div>
      <div class="text-sm text-gray-700 flex items-center gap-2">
        <span v-if="span.type === 'retain'" class="text-green-600">
          {{ getOperationDiff(span, i) }}
        </span>
        <span
          v-else-if="span.type === 'delete'"
          class="line-through text-red-600"
        >
          {{ getOperationDiff(span, i) }}
        </span>
        <span v-else-if="span.type === 'insert'" class="text-blue-600">
          +{{ span.text }}
        </span>
        <span class="text-gray-500">→</span>
        <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
          "{{ intermediateResults[i + 1] }}"
        </span>
      </div>
    </div>
  </div>
</template>
