<script setup lang="ts">
import type { NodeContent } from './types'

// 新しいNodeContentDiff型を定義
type NodeContentDiff = {
  uuid: string
  type: 'added' | 'deleted' | 'modified' | 'unchanged'
  before?: NodeContent
  after?: NodeContent
  changes?: Array<{
    property: string
    before: any
    after: any
  }>
}

interface Props {
  nodeContentDiffs: NodeContentDiff[]
}

defineProps<Props>()

const getOperationType = (type: 'added' | 'deleted' | 'modified' | 'unchanged') => {
  switch (type) {
    case 'added': return { label: 'Added', class: 'bg-green-100 text-green-800' }
    case 'deleted': return { label: 'Deleted', class: 'bg-red-100 text-red-800' }
    case 'modified': return { label: 'Modified', class: 'bg-yellow-100 text-yellow-800' }
    case 'unchanged': return { label: 'Unchanged', class: 'bg-gray-100 text-gray-800' }
    default: return { label: 'Unknown', class: 'bg-gray-100 text-gray-800' }
  }
}

// 変更内容をフォーマット
const formatChanges = (changes: Array<{ property: string, before: any, after: any }>): string => {
  return changes.map(change => {
    const { property, before, after } = change
    
    if (property === 'textContent') {
      return `text: "${before}" → "${after}"`
    }
    if (property === 'class') {
      return `class: [${before?.join(', ') || ''}] → [${after?.join(', ') || ''}]`
    }
    if (property === 'style') {
      const beforeStyle = Object.entries(before || {}).map(([k, v]) => `${k}: ${v}`).join('; ')
      const afterStyle = Object.entries(after || {}).map(([k, v]) => `${k}: ${v}`).join('; ')
      return `style: {${beforeStyle}} → {${afterStyle}}`
    }
    if (property === 'id') {
      return `id: "${before || ''}" → "${after || ''}"`
    }
    if (property === 'tagName') {
      return `tag: ${before} → ${after}`
    }
    if (property === 'data') {
      const beforeData = Object.entries(before || {}).map(([k, v]) => `${k}="${v}"`).join(', ')
      const afterData = Object.entries(after || {}).map(([k, v]) => `${k}="${v}"`).join(', ')
      return `data: {${beforeData}} → {${afterData}}`
    }
    
    return `${property}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`
  }).join(', ')
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="nodeContentDiffs.length === 0" class="text-gray-500 italic">
      No content changes detected
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="(diff, index) in nodeContentDiffs"
        :key="index"
      >
        <!-- 追加されたアイテム -->
        <div v-if="diff.type === 'added'" class="font-mono text-sm p-2 rounded bg-green-50 border-l-2 border-green-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(diff.type).class"
          >
            {{ getOperationType(diff.type).label }}
          </span>
          <span class="text-green-700 font-medium">+ </span>
          <span class="text-green-600">{{ diff.uuid }}</span>
        </div>
        
        <!-- 削除されたアイテム -->
        <div v-else-if="diff.type === 'deleted'" class="font-mono text-sm p-2 rounded bg-red-50 border-l-2 border-red-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(diff.type).class"
          >
            {{ getOperationType(diff.type).label }}
          </span>
          <span class="text-red-700 font-medium">- </span>
          <span class="text-red-600">{{ diff.uuid }}</span>
        </div>
        
        <!-- 変更なしのアイテム -->
        <div v-else-if="diff.type === 'unchanged'" class="font-mono text-sm p-2 rounded bg-gray-50 border-l-2 border-gray-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(diff.type).class"
          >
            {{ getOperationType(diff.type).label }}
          </span>
          <span class="text-gray-700 font-medium">= </span>
          <span class="text-gray-600">{{ diff.uuid }}</span>
        </div>
        
        <!-- 修正されたアイテム -->
        <div v-else-if="diff.type === 'modified'" class="font-mono text-sm p-2 rounded bg-yellow-50 border-l-2 border-yellow-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(diff.type).class"
          >
            {{ getOperationType(diff.type).label }}
          </span>
          <span class="text-yellow-700 font-medium">~ </span>
          <span class="text-yellow-600">
            {{ diff.uuid }} ({{ formatChanges(diff.changes || []) }})
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>