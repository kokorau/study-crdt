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

// NodeContent個別差分計算
type NodeContentDiff = {
  uuid: string;
  type: "added" | "deleted" | "modified" | "unchanged";
  before?: NodeContent;
  after?: NodeContent;
  changes?: Array<{
    property: string;
    before: any;
    after: any;
  }>;
};

const nodeContentDiffs = computed((): NodeContentDiff[] => {
  const beforeMap = new Map<string, NodeContent>();
  const afterMap = new Map<string, NodeContent>();

  // マップを作成
  props.diffData.before.nodeContentList.forEach((item) =>
    beforeMap.set(item.uuid, item),
  );
  props.diffData.after.nodeContentList.forEach((item) =>
    afterMap.set(item.uuid, item),
  );

  // 全UUIDを取得
  const allUuids = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  const diffs: NodeContentDiff[] = [];

  for (const uuid of allUuids) {
    const before = beforeMap.get(uuid);
    const after = afterMap.get(uuid);

    if (!before && after) {
      // 追加
      diffs.push({ uuid, type: "added", after });
    } else if (before && !after) {
      // 削除
      diffs.push({ uuid, type: "deleted", before });
    } else if (before && after) {
      // 変更チェック
      const changes: Array<{ property: string; before: any; after: any }> = [];

      // textContent比較
      if (before.textContent !== after.textContent) {
        changes.push({
          property: "textContent",
          before: before.textContent,
          after: after.textContent,
        });
      }

      // tagName比較
      if (before.tagName !== after.tagName) {
        changes.push({
          property: "tagName",
          before: before.tagName,
          after: after.tagName,
        });
      }

      // attrs.class比較
      if (
        JSON.stringify(before.attrs.class.sort()) !==
        JSON.stringify(after.attrs.class.sort())
      ) {
        changes.push({
          property: "class",
          before: before.attrs.class,
          after: after.attrs.class,
        });
      }

      // attrs.id比較
      if (before.attrs.id !== after.attrs.id) {
        changes.push({
          property: "id",
          before: before.attrs.id,
          after: after.attrs.id,
        });
      }

      // style比較
      if (JSON.stringify(before.style) !== JSON.stringify(after.style)) {
        changes.push({
          property: "style",
          before: before.style,
          after: after.style,
        });
      }

      // attrs.data比較
      if (
        JSON.stringify(before.attrs.data) !== JSON.stringify(after.attrs.data)
      ) {
        changes.push({
          property: "data",
          before: before.attrs.data,
          after: after.attrs.data,
        });
      }

      if (changes.length > 0) {
        diffs.push({ uuid, type: "modified", before, after, changes });
      } else {
        diffs.push({ uuid, type: "unchanged", before, after });
      }
    }
  }

  return diffs.sort((a, b) => a.uuid.localeCompare(b.uuid));
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
  let added = 0,
    deleted = 0;

  nodeContentDiffs.value.forEach((diff) => {
    if (diff.type === "added") added++;
    else if (diff.type === "deleted") deleted++;
    else if (diff.type === "modified") added++; // 修正も変更として扱う
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
      <NodeContentDiff :node-content-diffs="nodeContentDiffs" />
    </section>
  </div>
</template>

<style scoped></style>
