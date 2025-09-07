<script setup lang="ts">
import { computed } from "vue";
import { $Patch, type Patch, Comparers } from "@study-crdt/myers-diff";
import type { NodeDiffData, NodeItem, NodeContent } from "./types";
import { buildRenderTree, renderNodeToString } from "./utils";
import NodeStructureDiff from "./NodeStructureDiff.vue";
import NodeContentDiff from "./NodeContentDiff.vue";

interface Props {
  diffData: NodeDiffData;
}

const props = defineProps<Props>();

// NodeItem用のcomparer - UUIDのみで同一性を判断
const nodeItemComparer = Comparers.custom<NodeItem>((a, b) => {
  return a.uuid === b.uuid;
});

// 構造の差分を計算
const structurePatch = computed(() => {
  try {
    return $Patch.createFromDiff(
      props.diffData.before.nodeList,
      props.diffData.after.nodeList,
      nodeItemComparer,
    ) as Patch<NodeItem>;
  } catch (error) {
    console.error("Error creating structure patch:", error);
    return $Patch.create({
      baseVersion: props.diffData.before.nodeList,
      spans: [],
    }) as Patch<NodeItem>;
  }
});

// NodeContent用のcomparer - UUIDのみで同一性を判断
const nodeContentComparer = Comparers.custom<NodeContent>((a, b) => {
  return a.uuid === b.uuid;
});

// コンテンツの差分を計算
const contentPatch = computed(() => {
  try {
    return $Patch.createFromDiff(
      props.diffData.before.nodeContentList,
      props.diffData.after.nodeContentList,
      nodeContentComparer,
    ) as Patch<NodeContent>;
  } catch (error) {
    console.error("Error creating content patch:", error);
    return $Patch.create({
      baseVersion: props.diffData.before.nodeContentList,
      spans: [],
    }) as Patch<NodeContent>;
  }
});

// レンダリング用ツリー構築
const beforeTree = computed(() => buildRenderTree(props.diffData.before));
const afterTree = computed(() => buildRenderTree(props.diffData.after));

// HTML文字列表現
const beforeHtml = computed(() =>
  beforeTree.value.map((node) => renderNodeToString(node)).join("\n"),
);
const afterHtml = computed(() =>
  afterTree.value.map((node) => renderNodeToString(node)).join("\n"),
);

// 統計情報（実際の表示に合わせた数値）
const structureChangesCount = computed(() => {
  // NodeStructureDiffコンポーネントで処理された結果をカウントしたいが、
  // 直接アクセスできないので、ここでは元のspanの数を使用
  return structurePatch.value.spans.filter((span) => span.type !== "retain")
    .length;
});

const contentChangesCount = computed(() => {
  return contentPatch.value.spans.filter((span) => span.type !== "retain")
    .length;
});

const totalNodes = computed(() => {
  return Math.max(
    props.diffData.before.nodeList.length,
    props.diffData.after.nodeList.length,
  );
});

// GitHub風差分統計
const structureDiffSummary = computed(() => {
  const spans = structurePatch.value.spans;
  let added = 0,
    deleted = 0;

  spans.forEach((span) => {
    if (span.type === "insert") added += span.items.length;
    else if (span.type === "delete") deleted += span.count;
  });

  return { added, deleted };
});

const contentDiffSummary = computed(() => {
  const spans = contentPatch.value.spans;
  let added = 0,
    deleted = 0;

  spans.forEach((span) => {
    if (span.type === "insert") added += span.items.length;
    else if (span.type === "delete") deleted += span.count;
  });

  return { added, deleted };
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-sm space-y-8">
    <!-- HTML構造の可視化 -->
    <section>
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        HTML Structure Representation
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-medium text-gray-700 mb-2">Before</h3>
          <pre
            class="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap"
            >{{ beforeHtml }}</pre
          >
        </div>
        <div>
          <h3 class="text-lg font-medium text-gray-700 mb-2">After</h3>
          <pre
            class="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap"
            >{{ afterHtml }}</pre
          >
        </div>
      </div>
    </section>

    <!-- ノード構造の差分 -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800">Node Structure Diff</h2>
        <div class="font-mono text-sm">
          <span
            v-if="structureDiffSummary.added > 0"
            class="text-green-600 font-medium"
            >+{{ structureDiffSummary.added }}</span
          >
          <span
            v-if="structureDiffSummary.deleted > 0"
            class="text-red-600 font-medium"
            >−{{ structureDiffSummary.deleted }}</span
          >
          <span
            v-if="
              structureDiffSummary.added === 0 &&
              structureDiffSummary.deleted === 0
            "
            class="text-gray-500"
            >No changes</span
          >
        </div>
      </div>
      <NodeStructureDiff
        :patch="structurePatch"
        :before-node-list="diffData.before.nodeList"
        :after-node-list="diffData.after.nodeList"
      />
    </section>

    <!-- ノードコンテンツの差分 -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-800">Node Content Diff</h2>
        <div class="font-mono text-sm">
          <span
            v-if="contentDiffSummary.added > 0"
            class="text-green-600 font-medium"
            >+{{ contentDiffSummary.added }}</span
          >
          <span
            v-if="contentDiffSummary.deleted > 0"
            class="text-red-600 font-medium"
            >−{{ contentDiffSummary.deleted }}</span
          >
          <span
            v-if="
              contentDiffSummary.added === 0 && contentDiffSummary.deleted === 0
            "
            class="text-gray-500"
            >No changes</span
          >
        </div>
      </div>
      <NodeContentDiff
        :patch="contentPatch"
        :before-node-content-list="diffData.before.nodeContentList"
        :after-node-content-list="diffData.after.nodeContentList"
      />
    </section>
  </div>
</template>

<style scoped></style>
