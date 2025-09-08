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

// サンプルデータパターン
const samples = {
  // サンプル1: 基本的な構造変更とコンテンツ変更
  sample1: {
    name: "Basic Structure & Content Changes",
    before: {
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
    },
    after: {
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
    }
  },
  
  // サンプル2: コンテンツのみ変更（構造変更なし）
  sample2: {
    name: "Content Only Changes",
    before: {
      nodeList: [
        { uuid: "root", children: ["header", "main", "footer"] },
        { uuid: "header", children: ["title"] },
        { uuid: "main", children: ["content"] },
        { uuid: "footer", children: [] },
        { uuid: "title", children: [] },
        { uuid: "content", children: [] }
      ] as NodeItem[],
      nodeContentList: [
        {
          uuid: "root",
          tagName: "div",
          attrs: { data: {}, class: ["page"], id: "page-root" },
          style: { padding: "20px" }
        },
        {
          uuid: "header",
          tagName: "header",
          attrs: { data: {}, class: ["header"], id: undefined },
          style: { backgroundColor: "blue" }
        },
        {
          uuid: "main",
          tagName: "main",
          attrs: { data: { role: "main" }, class: ["content"], id: undefined },
          style: {}
        },
        {
          uuid: "footer",
          tagName: "footer",
          attrs: { data: {}, class: [], id: "footer" },
          style: {}
        },
        {
          uuid: "title",
          textContent: "Old Title",
          attrs: { data: {}, class: ["title"], id: undefined },
          style: { fontSize: "24px" }
        },
        {
          uuid: "content",
          textContent: "Original content here",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        }
      ] as NodeContent[]
    },
    after: {
      nodeList: [
        { uuid: "root", children: ["header", "main", "footer"] },
        { uuid: "header", children: ["title"] },
        { uuid: "main", children: ["content"] },
        { uuid: "footer", children: [] },
        { uuid: "title", children: [] },
        { uuid: "content", children: [] }
      ] as NodeItem[],
      nodeContentList: [
        {
          uuid: "root",
          tagName: "div",
          attrs: { data: {}, class: ["page", "responsive"], id: "page-root" },
          style: { padding: "20px", margin: "10px" }
        },
        {
          uuid: "header",
          tagName: "header",
          attrs: { data: {}, class: ["header", "sticky"], id: undefined },
          style: { backgroundColor: "darkblue" }
        },
        {
          uuid: "main",
          tagName: "main",
          attrs: { data: { role: "main", section: "content" }, class: ["content", "expanded"], id: undefined },
          style: {}
        },
        {
          uuid: "footer",
          tagName: "footer",
          attrs: { data: {}, class: ["footer"], id: "footer" },
          style: {}
        },
        {
          uuid: "title",
          textContent: "Updated Title",
          attrs: { data: {}, class: ["title", "large"], id: undefined },
          style: { fontSize: "32px", fontWeight: "bold" }
        },
        {
          uuid: "content",
          textContent: "Updated content with more details",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        }
      ] as NodeContent[]
    }
  },

  // サンプル3: 構造のみ変更（コンテンツ変更なし）
  sample3: {
    name: "Structure Only Changes", 
    before: {
      nodeList: [
        { uuid: "app", children: ["sidebar", "main"] },
        { uuid: "sidebar", children: ["nav1", "nav2"] },
        { uuid: "main", children: ["article"] },
        { uuid: "nav1", children: [] },
        { uuid: "nav2", children: [] },
        { uuid: "article", children: [] }
      ] as NodeItem[],
      nodeContentList: [
        {
          uuid: "app",
          tagName: "div",
          attrs: { data: {}, class: ["app"], id: "app" },
          style: {}
        },
        {
          uuid: "sidebar",
          tagName: "aside",
          attrs: { data: {}, class: ["sidebar"], id: undefined },
          style: {}
        },
        {
          uuid: "main",
          tagName: "main",
          attrs: { data: {}, class: ["main"], id: undefined },
          style: {}
        },
        {
          uuid: "nav1",
          textContent: "Navigation 1",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        },
        {
          uuid: "nav2",
          textContent: "Navigation 2",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        },
        {
          uuid: "article",
          textContent: "Article content",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        }
      ] as NodeContent[]
    },
    after: {
      nodeList: [
        { uuid: "app", children: ["main", "sidebar"] }, // 順序変更
        { uuid: "sidebar", children: ["nav1", "nav3"] }, // nav2 -> nav3に変更
        { uuid: "main", children: ["article", "comments"] }, // comments追加
        { uuid: "nav1", children: [] },
        { uuid: "nav3", children: [] },
        { uuid: "article", children: [] },
        { uuid: "comments", children: [] }
      ] as NodeItem[],
      nodeContentList: [
        {
          uuid: "app",
          tagName: "div",
          attrs: { data: {}, class: ["app"], id: "app" },
          style: {}
        },
        {
          uuid: "sidebar",
          tagName: "aside",
          attrs: { data: {}, class: ["sidebar"], id: undefined },
          style: {}
        },
        {
          uuid: "main",
          tagName: "main",
          attrs: { data: {}, class: ["main"], id: undefined },
          style: {}
        },
        {
          uuid: "nav1",
          textContent: "Navigation 1",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        },
        {
          uuid: "nav3",
          textContent: "Navigation 2",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        },
        {
          uuid: "article",
          textContent: "Article content",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        },
        {
          uuid: "comments",
          textContent: "Article content",
          attrs: { data: {}, class: [], id: undefined },
          style: {}
        }
      ] as NodeContent[]
    }
  }
};

const selectedSample = ref<keyof typeof samples>("sample1");
const beforeNodeList = ref<NodeItem[]>(samples.sample1.before.nodeList);
const beforeNodeContentList = ref<NodeContent[]>(samples.sample1.before.nodeContentList);
const afterNodeList = ref<NodeItem[]>(samples.sample1.after.nodeList);
const afterNodeContentList = ref<NodeContent[]>(samples.sample1.after.nodeContentList);

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

const loadSample = (sampleKey: keyof typeof samples) => {
  const sample = samples[sampleKey];
  selectedSample.value = sampleKey;
  beforeNodeList.value = [...sample.before.nodeList];
  beforeNodeContentList.value = [...sample.before.nodeContentList];
  afterNodeList.value = [...sample.after.nodeList];
  afterNodeContentList.value = [...sample.after.nodeContentList];
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto py-8 px-4 flex flex-col items-stretch justify-start">
      <div class="mb-8 bg-white p-6 rounded-lg shadow-sm">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">
          Node Diff Visualization (HTML Structure)
        </h1>
        
        <!-- サンプル選択 -->
        <div class="mb-6">
          <p class="text-sm text-gray-600 mb-3">選択可能なサンプル:</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(sample, key) in samples"
              :key="key"
              @click="loadSample(key)"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                selectedSample === key
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              ]"
            >
              {{ sample.name }}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            現在のサンプル: {{ samples[selectedSample].name }}
          </p>
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