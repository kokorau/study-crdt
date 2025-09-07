<script setup lang="ts">
import { computed } from 'vue'
import type { Patch } from '@study-crdt/myers-diff'
import type { NodeContent } from './types'

interface Props {
  patch: Patch<NodeContent>
  beforeNodeContentList: NodeContent[]
  afterNodeContentList: NodeContent[]
}

const props = defineProps<Props>()

// 修正されたSpanの型
type ProcessedSpan = 
  | { type: 'insert', items: NodeContent[], length: number }
  | { type: 'delete', count: number, length: number, deletedItems?: NodeContent[] }
  | { type: 'retain', count: number, length: number, item?: NodeContent }
  | { type: 'modify', before: NodeContent, after: NodeContent, length: number }

const getOperationType = (type: 'insert' | 'delete' | 'retain' | 'modify') => {
  switch (type) {
    case 'insert': return { label: 'Added', class: 'bg-green-100 text-green-800' }
    case 'delete': return { label: 'Deleted', class: 'bg-red-100 text-red-800' }
    case 'retain': return { label: 'Unchanged', class: 'bg-gray-100 text-gray-800' }
    case 'modify': return { label: 'Modified', class: 'bg-yellow-100 text-yellow-800' }
    default: return { label: 'Unknown', class: 'bg-gray-100 text-gray-800' }
  }
}

// 簡略化されたNodeContentフォーマット
const formatNodeContent = (content: NodeContent) => {
  return content.uuid
}

// 変更内容の詳細表示
const formatContentChange = (before: NodeContent, after: NodeContent): string => {
  const changes: string[] = []
  
  if (before.textContent !== after.textContent) {
    changes.push(`text: "${before.textContent}" → "${after.textContent}"`)
  }
  
  if (JSON.stringify(before.attrs.class) !== JSON.stringify(after.attrs.class)) {
    changes.push(`class: [${before.attrs.class.join(', ')}] → [${after.attrs.class.join(', ')}]`)
  }
  
  if (JSON.stringify(before.style) !== JSON.stringify(after.style)) {
    const beforeStyle = Object.entries(before.style).map(([k, v]) => `${k}: ${v}`).join('; ')
    const afterStyle = Object.entries(after.style).map(([k, v]) => `${k}: ${v}`).join('; ')
    changes.push(`style: {${beforeStyle}} → {${afterStyle}}`)
  }
  
  return changes.join(', ')
}

// Content差分の処理
const processedSpans = computed((): ProcessedSpan[] => {
  const spans = props.patch.spans
  const processed: ProcessedSpan[] = []
  
  let beforePosition = 0
  let afterPosition = 0
  
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    
    // Delete + Insert のペアをチェック
    if (span.type === 'delete' && i + 1 < spans.length) {
      const nextSpan = spans[i + 1]
      
      if (nextSpan.type === 'insert' && span.count === 1 && nextSpan.items.length === 1) {
        const deletedItem = props.beforeNodeContentList[beforePosition]
        const insertedItem = nextSpan.items[0]
        
        if (deletedItem && insertedItem && deletedItem.uuid === insertedItem.uuid) {
          processed.push({
            type: 'modify',
            before: deletedItem,
            after: insertedItem,
            length: 1
          })
          beforePosition += span.count
          afterPosition += nextSpan.items.length
          i++
          continue
        }
      }
    }
    
    // Retain内の変更をチェック
    if (span.type === 'retain') {
      for (let k = 0; k < span.count; k++) {
        const beforeItem = props.beforeNodeContentList[beforePosition + k]
        const afterItem = props.afterNodeContentList[afterPosition + k]
        
        if (beforeItem && afterItem) {
          // 内容が異なる場合はmodify
          const beforeJson = JSON.stringify({
            textContent: beforeItem.textContent,
            attrs: beforeItem.attrs,
            style: beforeItem.style
          })
          const afterJson = JSON.stringify({
            textContent: afterItem.textContent,
            attrs: afterItem.attrs,
            style: afterItem.style
          })
          
          if (beforeJson !== afterJson) {
            processed.push({
              type: 'modify',
              before: beforeItem,
              after: afterItem,
              length: 1
            })
          } else {
            processed.push({
              type: 'retain',
              count: 1,
              length: 1,
              item: beforeItem
            })
          }
        }
      }
      beforePosition += span.count
      afterPosition += span.count
      continue
    }
    
    // 通常の処理
    if (span.type === 'insert') {
      processed.push({
        type: 'insert',
        items: span.items,
        length: span.items.length
      })
      afterPosition += span.items.length
    } else if (span.type === 'delete') {
      const deletedItems = props.beforeNodeContentList.slice(beforePosition, beforePosition + span.count)
      processed.push({
        type: 'delete',
        count: span.count,
        length: span.count,
        deletedItems
      })
      beforePosition += span.count
    }
  }
  
  return processed
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="processedSpans.length === 0" class="text-gray-500 italic">
      No content changes detected
    </div>
    
    <div v-else class="space-y-2">
      <div
        v-for="(span, index) in processedSpans"
        :key="index"
      >
        <!-- 追加されたアイテム -->
        <div v-if="span.type === 'insert'" class="font-mono text-sm p-2 rounded bg-green-50 border-l-2 border-green-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(span.type).class"
          >
            {{ getOperationType(span.type).label }}
          </span>
          <span class="text-green-700 font-medium">+ </span>
          <span v-for="(item, itemIndex) in span.items" :key="itemIndex" class="text-green-600">
            {{ formatNodeContent(item) }}{{ itemIndex < span.items.length - 1 ? ', ' : '' }}
          </span>
        </div>
        
        <!-- 削除されたアイテム -->
        <div v-else-if="span.type === 'delete'" class="font-mono text-sm p-2 rounded bg-red-50 border-l-2 border-red-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(span.type).class"
          >
            {{ getOperationType(span.type).label }}
          </span>
          <span class="text-red-700 font-medium">- </span>
          <span v-if="(span as any).deletedItems" class="text-red-600">
            <span v-for="(item, itemIndex) in (span as any).deletedItems" :key="itemIndex">
              {{ formatNodeContent(item) }}{{ itemIndex < (span as any).deletedItems.length - 1 ? ', ' : '' }}
            </span>
          </span>
          <span v-else class="text-red-600">{{ span.count }} item(s)</span>
        </div>
        
        <!-- 変更なしのアイテム -->
        <div v-else-if="span.type === 'retain'" class="font-mono text-sm p-2 rounded bg-gray-50 border-l-2 border-gray-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(span.type).class"
          >
            {{ getOperationType(span.type).label }}
          </span>
          <span class="text-gray-700 font-medium">= </span>
          <span v-if="(span as any).item" class="text-gray-600">
            {{ formatNodeContent((span as any).item) }}
          </span>
          <span v-else class="text-gray-600">{{ span.count }} item(s)</span>
        </div>
        
        <!-- 修正されたアイテム -->
        <div v-else-if="span.type === 'modify'" class="font-mono text-sm p-2 rounded bg-yellow-50 border-l-2 border-yellow-300">
          <span
            class="px-2 py-1 rounded text-xs font-medium mr-2"
            :class="getOperationType(span.type).class"
          >
            {{ getOperationType(span.type).label }}
          </span>
          <span class="text-yellow-700 font-medium">~ </span>
          <span class="text-yellow-600">
            {{ formatNodeContent(span.before) }} ({{ formatContentChange(span.before, span.after) }})
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>