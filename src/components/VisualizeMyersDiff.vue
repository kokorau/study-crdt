<script lang="ts" setup>
import { computed } from "vue";
import type { Patch } from "../myers-diff";
import { $Patch } from "../myers-diff";
import { useDiffVisualization } from "../composables/useDiffVisualization";
import DiffGrid from "./DiffGrid.vue";
import EditOperations from "./EditOperations.vue";

interface Props {
  patch?: Patch;
}

const props = withDefaults(defineProps<Props>(), {
  patch: () =>
    $Patch.create({
      baseVersion: "",
      spans: [],
    }),
});

// Safety check for patch
const safePatch = computed(() => {
  if (!props.patch || !props.patch.baseVersion) {
    return $Patch.create({
      baseVersion: "",
      spans: [],
    });
  }
  return props.patch;
});

const {
  gridInfo,
  intermediateResults,
  editPath,
  gridCells,
  pathSegments,
  getOperationDiff,
} = useDiffVisualization(safePatch);
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-sm">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">
        Myers Diff Visualization
      </h2>
    </div>

    <div class="flex flex-row items-start justify-center gap-3">
      <DiffGrid
        class="flex-2"
        :grid-info="gridInfo"
        :grid-cells="gridCells"
        :path-segments="pathSegments"
        :edit-path="editPath"
      />

      <EditOperations
        class="flex-1"
        :patch="safePatch"
        :intermediate-results="intermediateResults"
        :get-operation-diff="getOperationDiff"
      />
    </div>
  </div>
</template>
