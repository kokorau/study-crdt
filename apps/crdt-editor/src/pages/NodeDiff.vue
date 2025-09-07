<script setup lang="ts">
import { computed, ref } from "vue";
import VisualizeNodeDiff from "../components/NodeDiff/VisualizeNodeDiff.vue";

// 型定義
type NodeItem = {
  uuid: string
  children: string[]
}

type NodeContent = {
  uuid: string
  tagName?: string
  textContent?: string
  attrs: {
    data: Record<string, string>
    class: string[]
    id?: string
  }
  style: Record<string, string>
}

// サンプルデータ
const sampleBefore = {
  nodeList: [
    { uuid: "root", children: ["div1", "div2"] },
    { uuid: "div1", children: ["text1"] },
    { uuid: "div2", children: [] },
    { uuid: "text1", children: [] }
  ] as NodeItem[],
  nodeContentList: [
    {
      uuid: "root",
      tagName: "div",
      attrs: { data: {}, class: ["container"], id: "app" },
      style: {}
    },
    {
      uuid: "div1",
      tagName: "div",
      attrs: { data: {}, class: ["content"], id: undefined },
      style: { color: "red" }
    },
    {
      uuid: "div2",
      tagName: "div",
      attrs: { data: {}, class: [], id: undefined },
      style: {}
    },
    {
      uuid: "text1",
      textContent: "Hello World",
      attrs: { data: {}, class: [], id: undefined },
      style: {}
    }
  ] as NodeContent[]
};

const sampleAfter = {
  nodeList: [
    { uuid: "root", children: ["div1", "div3"] },
    { uuid: "div1", children: ["text1"] },
    { uuid: "div3", children: ["text2"] },
    { uuid: "text1", children: [] },
    { uuid: "text2", children: [] }
  ] as NodeItem[],
  nodeContentList: [
    {
      uuid: "root",
      tagName: "div",
      attrs: { data: {}, class: ["container", "modified"], id: "app" },
      style: {}
    },
    {
      uuid: "div1",
      tagName: "div",
      attrs: { data: {}, class: ["content"], id: undefined },
      style: { color: "blue" }
    },
    {
      uuid: "div3",
      tagName: "div",
      attrs: { data: {}, class: ["new-content"], id: undefined },
      style: {}
    },
    {
      uuid: "text1",
      textContent: "Hello Vue",
      attrs: { data: {}, class: [], id: undefined },
      style: {}
    },
    {
      uuid: "text2",
      textContent: "New Text",
      attrs: { data: {}, class: [], id: undefined },
      style: {}
    }
  ] as NodeContent[]
};

// const selectedExample = ref<"sample1" | "custom">("sample1");
const beforeNodeList = ref<NodeItem[]>(sampleBefore.nodeList);
const beforeNodeContentList = ref<NodeContent[]>(sampleBefore.nodeContentList);
const afterNodeList = ref<NodeItem[]>(sampleAfter.nodeList);
const afterNodeContentList = ref<NodeContent[]>(sampleAfter.nodeContentList);

const diffData = computed(() => ({
  before: {
    nodeList: beforeNodeList.value,
    nodeContentList: beforeNodeContentList.value
  },
  after: {
    nodeList: afterNodeList.value,
    nodeContentList: afterNodeContentList.value
  }
}));

const loadSample = () => {
  beforeNodeList.value = [...sampleBefore.nodeList];
  beforeNodeContentList.value = [...sampleBefore.nodeContentList];
  afterNodeList.value = [...sampleAfter.nodeList];
  afterNodeContentList.value = [...sampleAfter.nodeContentList];
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto py-8 px-4 flex flex-col items-stretch justify-start">
      <div class="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">
          Node Diff Visualization (HTML Structure)
        </h1>
        
        <!-- サンプル例 -->
        <div class="mb-6">
          <p class="text-sm text-gray-600 mb-2">Node structure examples:</p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="loadSample"
              class="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
            >
              Load Sample (Structure Change)
            </button>
          </div>
        </div>

        <!-- データ表示 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-700">Before</h3>
            <div class="bg-gray-100 p-4 rounded">
              <h4 class="font-medium mb-2">Node Structure:</h4>
              <pre class="text-xs bg-white p-2 rounded">{{ JSON.stringify(beforeNodeList, null, 2) }}</pre>
            </div>
            <div class="bg-gray-100 p-4 rounded">
              <h4 class="font-medium mb-2">Node Content:</h4>
              <pre class="text-xs bg-white p-2 rounded">{{ JSON.stringify(beforeNodeContentList, null, 2) }}</pre>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-700">After</h3>
            <div class="bg-gray-100 p-4 rounded">
              <h4 class="font-medium mb-2">Node Structure:</h4>
              <pre class="text-xs bg-white p-2 rounded">{{ JSON.stringify(afterNodeList, null, 2) }}</pre>
            </div>
            <div class="bg-gray-100 p-4 rounded">
              <h4 class="font-medium mb-2">Node Content:</h4>
              <pre class="text-xs bg-white p-2 rounded">{{ JSON.stringify(afterNodeContentList, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <VisualizeNodeDiff :diff-data="diffData" />
    </div>
  </div>
</template>

<style scoped></style>