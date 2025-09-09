<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useTextEditor } from '../composables/useTextEditor'
import LineEditor from '../components/TextEditor/LineEditor.vue'
import { createLineId } from '../text-editor'

// Initialize editor with debug mode
const editor = useTextEditor({
  actorName: 'Debug User',
  actorColor: '#6366F1',
})

// Track selected line
const selectedLineId = ref<string | null>(null)
const lineRefs = ref<Map<string, any>>(new Map())

// Register line editor refs
const registerLineRef = (lineId: string, ref: any) => {
  if (ref) {
    lineRefs.value.set(lineId, ref)
  } else {
    lineRefs.value.delete(lineId)
  }
}

// Handle line content update
const handleLineContentUpdate = (lineId: string, content: string) => {
  editor.updateLineContent(createLineId(lineId), content)
}

// Handle split line
const handleSplitLine = async (lineId: string, offset: number) => {
  const newLine = await editor.splitLine(createLineId(lineId), offset)
  if (newLine) {
    selectedLineId.value = newLine.id as string
    await nextTick()
    lineRefs.value.get(newLine.id as string)?.focus()
    lineRefs.value.get(newLine.id as string)?.setCursorPosition(0)
  }
}

// Handle merge with previous line
const handleMergeWithPrevious = async (lineId: string) => {
  const result = await editor.mergeWithPreviousLine(createLineId(lineId))
  if (result) {
    selectedLineId.value = result.lineId as string
    await nextTick()
    lineRefs.value.get(result.lineId as string)?.focus()
    lineRefs.value.get(result.lineId as string)?.setCursorPosition(result.offset)
  }
}

// Handle line focus
const handleLineFocus = (lineId: string) => {
  selectedLineId.value = lineId
}

// Handle cursor change
const handleCursorChange = (lineId: string, offset: number) => {
  editor.updateLocalCursor({
    lineId: createLineId(lineId),
    offset: offset as any,
  })
}

// Get actor color
const getActorColor = computed(() => {
  return editor.state.localActor?.color as string || '#000000'
})

// Debug information
const debugInfo = computed(() => {
  const doc = editor.state.document
  if (!doc) return null
  
  return {
    documentId: doc.id,
    lineCount: doc.lines.length,
    totalChars: doc.lines.reduce((sum, line) => sum + (line.content as string).length, 0),
    actorId: editor.state.localActor?.id,
    actorName: editor.state.localActor?.name,
    isConnected: editor.state.isConnected,
    isSyncing: editor.state.isSyncing,
  }
})

// Cleanup on unmount
onUnmounted(() => {
  editor.destroy()
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-6 text-center">Text Editor Debug Mode</h1>
      
      <!-- Debug Panel -->
      <div class="bg-gray-100 rounded-lg p-4 mb-6">
        <h3 class="text-sm font-semibold text-gray-600 mb-2">Debug Information</h3>
        <div v-if="debugInfo" class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span class="font-semibold">Document ID:</span> {{ debugInfo.documentId }}
          </div>
          <div>
            <span class="font-semibold">Lines:</span> {{ debugInfo.lineCount }}
          </div>
          <div>
            <span class="font-semibold">Total Characters:</span> {{ debugInfo.totalChars }}
          </div>
          <div>
            <span class="font-semibold">Actor:</span> {{ debugInfo.actorName }} ({{ debugInfo.actorId }})
          </div>
          <div>
            <span class="font-semibold">Connection:</span> 
            <span :class="debugInfo.isConnected ? 'text-green-600' : 'text-red-600'">
              {{ debugInfo.isConnected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
          <div>
            <span class="font-semibold">Sync Status:</span> 
            <span :class="debugInfo.isSyncing ? 'text-yellow-600' : 'text-green-600'">
              {{ debugInfo.isSyncing ? 'Syncing...' : 'Synced' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Editor -->
      <div>
        <!-- Status Bar -->
        <div class="bg-white rounded-t-lg shadow-lg p-3 border-b">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full animate-pulse"
                  :class="editor.state.isConnected ? 'bg-green-500' : 'bg-red-500'"
                />
                <span class="text-sm font-medium text-gray-700">
                  {{ editor.state.isConnected ? '接続中' : '切断' }}
                </span>
              </div>
              <div v-if="editor.state.localActor" class="flex items-center gap-2">
                <div 
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  :style="{ backgroundColor: editor.state.localActor.color }"
                >
                  {{ editor.state.localActor.name.charAt(0) }}
                </div>
                <span class="text-sm font-bold text-gray-700">
                  {{ editor.state.localActor.name }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                {{ editor.sortedLines?.value?.length || 0 }} 行
              </span>
              <span 
                class="px-2 py-1 text-xs rounded-full font-medium"
                :class="editor.state.isSyncing ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'"
              >
                {{ editor.state.isSyncing ? '同期中' : '同期済み' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Editor Content -->
        <div class="bg-white rounded-b-lg shadow-lg p-6" style="min-height: 400px;">
          <div class="space-y-0">
            <LineEditor
              v-for="line in (editor.sortedLines?.value || editor.sortedLines || [])"
              :key="line?.id || Math.random()"
              :ref="(el) => line?.id && registerLineRef(line.id as string, el)"
              :line="line"
              :is-selected="line?.id && selectedLineId === line.id"
              :actor-color="getActorColor"
              @update:content="(content) => line?.id && handleLineContentUpdate(line.id as string, content)"
              @split-line="(offset) => line?.id && handleSplitLine(line.id as string, offset)"
              @merge-with-previous="line?.id && handleMergeWithPrevious(line.id as string)"
              @focus="line?.id && handleLineFocus(line.id as string)"
              @cursor-change="(offset) => line?.id && handleCursorChange(line.id as string, offset)"
            />
            <div v-if="!editor.sortedLines?.value?.length" class="text-gray-400 text-sm">
              テキストを入力してください...
            </div>
          </div>
        </div>
      </div>

      <!-- Line Details (Debug) -->
      <div v-if="selectedLineId" class="bg-gray-100 rounded-lg p-4 mt-6">
        <h3 class="text-sm font-semibold text-gray-600 mb-2">Selected Line Details</h3>
        <div class="text-xs space-y-1">
          <div><span class="font-semibold">Line ID:</span> {{ selectedLineId }}</div>
          <div v-if="editor.sortedLines?.value">
            <span class="font-semibold">Content:</span> 
            <code class="bg-white px-1 py-0.5 rounded">
              {{ editor.sortedLines.value.find(l => l.id === selectedLineId)?.content || '' }}
            </code>
          </div>
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