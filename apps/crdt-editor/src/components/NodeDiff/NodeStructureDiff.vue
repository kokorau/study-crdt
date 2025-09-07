<script setup lang="ts">
import { computed } from 'vue'
import type { Patch } from '@study-crdt/myers-diff'
import type { NodeItem } from './types'

interface Props {
  patch: Patch<NodeItem>
  beforeNodeList: NodeItem[]
  afterNodeList: NodeItem[]
}

const props = defineProps<Props>()

// 修正されたSpanの型
type ProcessedSpan = 
  | { type: 'insert', items: NodeItem[], length: number }
  | { type: 'delete', count: number, length: number }
  | { type: 'retain', count: number, length: number }
  | { type: 'modify', before: NodeItem, after: NodeItem, length: number }

const getOperationType = (type: 'insert' | 'delete' | 'retain' | 'modify') => {
  switch (type) {
    case 'insert': return { label: 'Added', class: 'bg-green-100 text-green-800' }
    case 'delete': return { label: 'Deleted', class: 'bg-red-100 text-red-800' }
    case 'retain': return { label: 'Unchanged', class: 'bg-gray-100 text-gray-800' }
    case 'modify': return { label: 'Modified', class: 'bg-yellow-100 text-yellow-800' }
    default: return { label: 'Unknown', class: 'bg-gray-100 text-gray-800' }
  }
}


// 削除+挿入のペアをModifyとして統合し、retain内の変更も検出
const processedSpans = computed((): ProcessedSpan[] => {
  const spans = props.patch.spans
  const processed: ProcessedSpan[] = []
  
  let beforePosition = 0 // beforeListでの現在位置
  let afterPosition = 0  // afterListでの現在位置
  
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]
    
    // Delete + Insert のペアをチェック
    if (span.type === 'delete' && i + 1 < spans.length) {
      const nextSpan = spans[i + 1]
      
      if (nextSpan.type === 'insert' && span.count === 1 && nextSpan.items.length === 1) {
        const deletedItem = props.beforeNodeList[beforePosition]
        const insertedItem = nextSpan.items[0]
        
        if (deletedItem && insertedItem && deletedItem.uuid === insertedItem.uuid) {
          // Modify として処理
          processed.push({
            type: 'modify',
            before: deletedItem,
            after: insertedItem,
            length: 1
          })
          beforePosition += span.count
          afterPosition += nextSpan.items.length
          i++ // 次のspanもスキップ
          continue
        }
      }
    }
    
    // Retain内の変更をチェック
    if (span.type === 'retain') {
      for (let k = 0; k < span.count; k++) {
        const beforeItem = props.beforeNodeList[beforePosition + k]
        const afterItem = props.afterNodeList[afterPosition + k]
        
        if (beforeItem && afterItem) {
          // children配列が異なる場合はmodify
          const beforeChildren = JSON.stringify(beforeItem.children.sort())
          const afterChildren = JSON.stringify(afterItem.children.sort())
          
          if (beforeChildren !== afterChildren) {
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
              item: beforeItem // Unchangedアイテムの詳細も保存
            } as any)
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
      // 削除されたアイテムの詳細も保存
      const deletedItems = props.beforeNodeList.slice(beforePosition, beforePosition + span.count)
      processed.push({
        type: 'delete',
        count: span.count,
        length: span.count,
        deletedItems // 削除されたアイテムの詳細を追加
      } as any) // 型を一時的にanyに
      beforePosition += span.count
    }
  }
  
  return processed
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="processedSpans.length === 0" class="text-gray-500 italic">
      No structural changes detected
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
            {{ item.uuid }}{{ itemIndex < span.items.length - 1 ? ', ' : '' }}
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
              {{ item.uuid }}{{ itemIndex < (span as any).deletedItems.length - 1 ? ', ' : '' }}
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
            {{ (span as any).item.uuid }}
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
            {{ span.before.uuid }} (children: [{{ span.before.children.join(', ') }}] → [{{ span.after.children.join(', ') }}])
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>