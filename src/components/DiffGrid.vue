<script lang="ts" setup>
import type { GridInfo, GridCell, PathSegment, EditStep } from "../types/diff";
import ArrowMarkers from "./svg/ArrowMarkers.vue";

interface Props {
  gridInfo: GridInfo;
  gridCells: GridCell[];
  pathSegments: PathSegment[];
  editPath: EditStep[];
}

defineProps<Props>();

function getStrokeColor(operation: string): string {
  switch (operation) {
    case "match":
      return "#16a34a";
    case "delete":
      return "#dc2626";
    case "insert":
      return "#2563eb";
    default:
      return "#8b5cf6";
  }
}

function getFillColor(operation: string): string {
  return getStrokeColor(operation);
}
</script>

<template>
  <div class="overflow-auto">
    <div class="relative inline-block">
      <!-- Character labels -->
      <div class="flex mb-2">
        <div class="w-8 h-8"></div>
        <div class="w-8 h-8"></div>
        <!-- Empty corner -->
        <div
          v-for="(char, i) in gridInfo.before"
          :key="i"
          class="w-8 h-8 flex items-center justify-center text-sm font-mono font-semibold text-gray-600"
        >
          {{ char }}
        </div>
      </div>

      <!-- Grid rows -->
      <div
        v-for="(_afterChar, y) in ['', ...gridInfo.after]"
        :key="y"
        class="flex"
      >
        <!-- Row label -->
        <div
          class="w-8 h-8 flex items-center justify-center text-sm font-mono font-semibold text-gray-600"
        >
          {{ y > 0 ? gridInfo.after[y - 1] : "" }}
        </div>

        <!-- Grid cells -->
        <div
          v-for="x in gridInfo.width + 1"
          :key="x - 1"
          class="relative w-8 h-8 border border-gray-300"
          :class="{
            'bg-green-100 border-green-400':
              gridCells.find((c) => c.x === x - 1 && c.y === y)?.operation ===
              'match',
            'bg-red-100 border-red-400':
              gridCells.find((c) => c.x === x - 1 && c.y === y)?.operation ===
              'delete',
            'bg-blue-100 border-blue-400':
              gridCells.find((c) => c.x === x - 1 && c.y === y)?.operation ===
              'insert',
            'bg-purple-100 border-purple-400':
              gridCells.find((c) => c.x === x - 1 && c.y === y)?.operation ===
              'start',
          }"
        >
          <!-- Path point indicator -->
          <div
            v-if="gridCells.find((c) => c.x === x - 1 && c.y === y)?.isOnPath"
            class="absolute inset-0 flex items-center justify-center"
          >
            <div class="w-2 h-2 bg-purple-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- SVG overlay for arrows -->
      <svg
        :width="(gridInfo.width + 2) * 32"
        :height="(gridInfo.height + 2) * 32"
        class="absolute top-0 left-0 pointer-events-none"
        style="transform: translate(32px, 40px)"
      >
        <ArrowMarkers />

        <!-- Path arrows -->
        <g v-for="(segment, i) in pathSegments" :key="i">
          <line
            :x1="
              segment.from.x * 32 +
              16 +
              (segment.to.x - segment.from.x) *
                (segment.to.x === segment.from.x ||
                segment.to.y === segment.from.y
                  ? 12
                  : 8)
            "
            :y1="
              segment.from.y * 32 +
              16 +
              (segment.to.y - segment.from.y) *
                (segment.to.x === segment.from.x ||
                segment.to.y === segment.from.y
                  ? 12
                  : 8)
            "
            :x2="
              segment.to.x * 32 +
              16 -
              (segment.to.x - segment.from.x) *
                (segment.to.x === segment.from.x ||
                segment.to.y === segment.from.y
                  ? 12
                  : 8)
            "
            :y2="
              segment.to.y * 32 +
              16 -
              (segment.to.y - segment.from.y) *
                (segment.to.x === segment.from.x ||
                segment.to.y === segment.from.y
                  ? 12
                  : 8)
            "
            :stroke="getStrokeColor(segment.operation)"
            stroke-width="2"
            opacity="0.8"
          />
        </g>

        <!-- Path step labels -->
        <g v-for="(step, i) in editPath" :key="`step-${i}`">
          <!-- Background circle for readability -->
          <circle
            :cx="step.x * 32 + 16"
            :cy="step.y * 32 + 16"
            :r="step.displayText && step.displayText.length > 1 ? 12 : 10"
            fill="white"
            :stroke="getStrokeColor(step.operation)"
            stroke-width="2"
            opacity="0.95"
          />
          <!-- Operation text -->
          <text
            :x="step.x * 32 + 16"
            :y="step.y * 32 + 20"
            text-anchor="middle"
            font-family="monospace"
            :font-size="
              step.displayText && step.displayText.length > 1 ? '8' : '10'
            "
            :fill="getFillColor(step.operation)"
            font-weight="bold"
          >
            {{ step.displayText }}
          </text>
        </g>
      </svg>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      <!-- Operations -->
      <div>
        <h4 class="text-sm font-semibold text-gray-600 mb-2">Operations</h4>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 bg-green-200 border border-green-400 rounded"
            ></div>
            <svg width="20" height="12" class="flex-shrink-0">
              <line
                x1="2"
                y1="6"
                x2="18"
                y2="6"
                stroke="#16a34a"
                stroke-width="2"
                marker-end="url(#legend-arrow-green)"
              />
            </svg>
            <span>Match (keep character)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
            <svg width="20" height="12" class="flex-shrink-0">
              <line
                x1="2"
                y1="6"
                x2="18"
                y2="6"
                stroke="#dc2626"
                stroke-width="2"
                marker-end="url(#legend-arrow-red)"
              />
            </svg>
            <span>Delete (remove character)</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 bg-blue-200 border border-blue-400 rounded"
            ></div>
            <svg width="20" height="12" class="flex-shrink-0">
              <line
                x1="2"
                y1="6"
                x2="18"
                y2="6"
                stroke="#2563eb"
                stroke-width="2"
                marker-end="url(#legend-arrow-blue)"
              />
            </svg>
            <span>Insert (add character)</span>
          </div>
        </div>
      </div>

      <!-- Character Labels -->
      <div>
        <h4 class="text-sm font-semibold text-gray-600 mb-2">
          Character Labels
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-white border-2 border-green-600 rounded-full flex items-center justify-center text-green-600 text-xs font-bold font-mono"
            >
              a
            </div>
            <span>Character matches (keep as-is)</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-white border-2 border-red-600 rounded-full flex items-center justify-center text-red-600 text-xs font-bold font-mono"
            >
              -a
            </div>
            <span>Delete character from source</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold font-mono"
            >
              +a
            </div>
            <span>Insert character to target</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 bg-white border-2 border-purple-600 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold"
            >
              •
            </div>
            <span>Starting point</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
