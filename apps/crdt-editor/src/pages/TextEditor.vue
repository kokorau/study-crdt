<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useSharedTextEditor } from '../composables/useSharedTextEditor'
import LineEditor from '../components/TextEditor/LineEditor.vue'
import { createLineId } from '../text-editor'

// Generate distinct colors for each editor
const editorColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
]

const editorNames = [
  'Alice',
  'Bob',
]

// Initialize two editor instances that share the same Yjs document
const editor1 = useSharedTextEditor({
  actorName: editorNames[0],
  actorColor: editorColors[0],
})

const editor2 = useSharedTextEditor({
  actorName: editorNames[1],
  actorColor: editorColors[1],
})

// Track selected lines for each editor
const selectedLineId1 = ref<string | null>(null)
const selectedLineId2 = ref<string | null>(null)
const lineRefs1 = ref<Map<string, any>>(new Map())
const lineRefs2 = ref<Map<string, any>>(new Map())

// Register line editor refs for editor 1
const registerLineRef1 = (lineId: string, ref: any) => {
  if (ref) {
    lineRefs1.value.set(lineId, ref)
  } else {
    lineRefs1.value.delete(lineId)
  }
}

// Register line editor refs for editor 2
const registerLineRef2 = (lineId: string, ref: any) => {
  if (ref) {
    lineRefs2.value.set(lineId, ref)
  } else {
    lineRefs2.value.delete(lineId)
  }
}

// Handle line content update for editor 1
const handleLineContentUpdate1 = (lineId: string, content: string) => {
  editor1.updateLineContent(createLineId(lineId), content)
}

// Handle line content update for editor 2
const handleLineContentUpdate2 = (lineId: string, content: string) => {
  editor2.updateLineContent(createLineId(lineId), content)
}

// Handle split line for editor 1
const handleSplitLine1 = async (lineId: string, offset: number) => {
  const newLine = await editor1.splitLine(createLineId(lineId), offset)
  if (newLine) {
    selectedLineId1.value = newLine.id as string
    await nextTick()
    lineRefs1.value.get(newLine.id as string)?.focus()
    lineRefs1.value.get(newLine.id as string)?.setCursorPosition(0)
  }
}

// Handle split line for editor 2
const handleSplitLine2 = async (lineId: string, offset: number) => {
  const newLine = await editor2.splitLine(createLineId(lineId), offset)
  if (newLine) {
    selectedLineId2.value = newLine.id as string
    await nextTick()
    lineRefs2.value.get(newLine.id as string)?.focus()
    lineRefs2.value.get(newLine.id as string)?.setCursorPosition(0)
  }
}

// Handle merge with previous line for editor 1
const handleMergeWithPrevious1 = async (lineId: string) => {
  const result = await editor1.mergeWithPreviousLine(createLineId(lineId))
  if (result) {
    selectedLineId1.value = result.lineId as string
    await nextTick()
    lineRefs1.value.get(result.lineId as string)?.focus()
    lineRefs1.value.get(result.lineId as string)?.setCursorPosition(result.offset)
  }
}

// Handle merge with previous line for editor 2
const handleMergeWithPrevious2 = async (lineId: string) => {
  const result = await editor2.mergeWithPreviousLine(createLineId(lineId))
  if (result) {
    selectedLineId2.value = result.lineId as string
    await nextTick()
    lineRefs2.value.get(result.lineId as string)?.focus()
    lineRefs2.value.get(result.lineId as string)?.setCursorPosition(result.offset)
  }
}

// Handle line focus for editor 1
const handleLineFocus1 = (lineId: string) => {
  selectedLineId1.value = lineId
}

// Handle line focus for editor 2
const handleLineFocus2 = (lineId: string) => {
  selectedLineId2.value = lineId
}

// Handle cursor change for editor 1
const handleCursorChange1 = (lineId: string, offset: number) => {
  editor1.updateLocalCursor({
    lineId: createLineId(lineId),
    offset: offset as any,
  })
}

// Handle cursor change for editor 2
const handleCursorChange2 = (lineId: string, offset: number) => {
  editor2.updateLocalCursor({
    lineId: createLineId(lineId),
    offset: offset as any,
  })
}

// Get actor color for editor 1
const getActorColor1 = computed(() => {
  return editor1.state.localActor?.color as string || '#000000'
})

// Get actor color for editor 2
const getActorColor2 = computed(() => {
  return editor2.state.localActor?.color as string || '#000000'
})

// Cleanup on unmount
onUnmounted(() => {
  // Note: We don't destroy the shared document here because it's shared
  // Only destroy if this is the last component using it
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-6 text-center">Yjs CRDT 共同編集デモ</h1>
      
      <!-- Two Editors Side by Side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Editor 1 (Alice) -->
        <div>
          <!-- Status Bar -->
          <div class="bg-white rounded-t-lg shadow-lg p-3 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-3 h-3 rounded-full animate-pulse"
                    :class="editor1.state.isConnected ? 'bg-green-500' : 'bg-red-500'"
                  />
                  <span class="text-sm font-medium text-gray-700">
                    {{ editor1.state.isConnected ? '接続中' : '切断' }}
                  </span>
                </div>
                <div v-if="editor1.state.localActor" class="flex items-center gap-2">
                  <div 
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    :style="{ backgroundColor: editor1.state.localActor.color }"
                  >
                    {{ editor1.state.localActor.name.charAt(0) }}
                  </div>
                  <span class="text-sm font-bold text-gray-700">
                    {{ editor1.state.localActor.name }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {{ editor1.sortedLines?.value?.length || 0 }} 行
                </span>
                <span 
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="editor1.state.isSyncing ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
                >
                  {{ editor1.state.isSyncing ? '同期中' : '同期済み' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Editor Content -->
          <div class="bg-white rounded-b-lg shadow-lg p-6" style="min-height: 500px;">
            <div class="space-y-0">
              <LineEditor
                v-for="line in (editor1.sortedLines?.value || editor1.sortedLines || [])"
                :key="line?.id || Math.random()"
                :ref="(el) => line?.id && registerLineRef1(line.id as string, el)"
                :line="line"
                :is-selected="line?.id && selectedLineId1 === line.id"
                :actor-color="getActorColor1"
                @update:content="(content) => line?.id && handleLineContentUpdate1(line.id as string, content)"
                @split-line="(offset) => line?.id && handleSplitLine1(line.id as string, offset)"
                @merge-with-previous="line?.id && handleMergeWithPrevious1(line.id as string)"
                @focus="line?.id && handleLineFocus1(line.id as string)"
                @cursor-change="(offset) => line?.id && handleCursorChange1(line.id as string, offset)"
              />
              <div v-if="!editor1.sortedLines?.value?.length" class="text-gray-400 text-sm">
                テキストを入力してください...
              </div>
            </div>
          </div>
        </div>

        <!-- Editor 2 (Bob) -->
        <div>
          <!-- Status Bar -->
          <div class="bg-white rounded-t-lg shadow-lg p-3 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-3 h-3 rounded-full animate-pulse"
                    :class="editor2.state.isConnected ? 'bg-green-500' : 'bg-red-500'"
                  />
                  <span class="text-sm font-medium text-gray-700">
                    {{ editor2.state.isConnected ? '接続中' : '切断' }}
                  </span>
                </div>
                <div v-if="editor2.state.localActor" class="flex items-center gap-2">
                  <div 
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    :style="{ backgroundColor: editor2.state.localActor.color }"
                  >
                    {{ editor2.state.localActor.name.charAt(0) }}
                  </div>
                  <span class="text-sm font-bold text-gray-700">
                    {{ editor2.state.localActor.name }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  {{ editor2.sortedLines?.value?.length || 0 }} 行
                </span>
                <span 
                  class="px-2 py-1 text-xs rounded-full font-medium"
                  :class="editor2.state.isSyncing ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
                >
                  {{ editor2.state.isSyncing ? '同期中' : '同期済み' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Editor Content -->
          <div class="bg-white rounded-b-lg shadow-lg p-6" style="min-height: 500px;">
            <div class="space-y-0">
              <LineEditor
                v-for="line in (editor2.sortedLines?.value || editor2.sortedLines || [])"
                :key="line?.id || Math.random()"
                :ref="(el) => line?.id && registerLineRef2(line.id as string, el)"
                :line="line"
                :is-selected="line?.id && selectedLineId2 === line.id"
                :actor-color="getActorColor2"
                @update:content="(content) => line?.id && handleLineContentUpdate2(line.id as string, content)"
                @split-line="(offset) => line?.id && handleSplitLine2(line.id as string, offset)"
                @merge-with-previous="line?.id && handleMergeWithPrevious2(line.id as string)"
                @focus="line?.id && handleLineFocus2(line.id as string)"
                @cursor-change="(offset) => line?.id && handleCursorChange2(line.id as string, offset)"
              />
              <div v-if="!editor2.sortedLines?.value?.length" class="text-gray-400 text-sm">
                テキストを入力してください...
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Info Panel -->
      <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">🎯 リアルタイム同期デモ</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="text-sm font-semibold text-gray-600 mb-3">実装技術</h4>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-green-500">✓</span>
                <span class="text-sm text-gray-600">Yjs CRDTによる競合解決</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-500">✓</span>
                <span class="text-sm text-gray-600">BroadcastChannel APIによるタブ間通信</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-500">✓</span>
                <span class="text-sm text-gray-600">LocalStorageによるデータ永続化</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-green-500">✓</span>
                <span class="text-sm text-gray-600">DDD/FPアーキテクチャ</span>
              </div>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-600 mb-3">操作方法</h4>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span class="text-sm text-gray-600">左右のエディタで同時に編集してみてください</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span class="text-sm text-gray-600">Enter: 新しい行を追加</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span class="text-sm text-gray-600">Backspace (空行): 前の行と結合</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500">•</span>
                <span class="text-sm text-gray-600">別タブでも同期されます</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <p class="text-sm text-gray-700 text-center">
            <span class="font-semibold">💡 ヒント:</span> 
            両方のエディタで同時に入力すると、CRDTが自動的に競合を解決します！
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[contenteditable]:focus {
  outline: 2px solid rgb(59 130 246 / 0.3);
  outline-offset: -2px;
}

[contenteditable]:empty:before {
  content: attr(placeholder);
  color: rgb(156 163 175);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>