<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import type { Line } from '../../text-editor'

const props = defineProps<{
  line: Line
  isSelected: boolean
  actorColor?: string
}>()

const emit = defineEmits<{
  'update:content': [content: string]
  'insert-text': [offset: number, text: string]
  'delete-text': [offset: number, length: number]
  'split-line': [offset: number]
  'merge-with-previous': []
  'focus': []
  'blur': []
  'cursor-change': [offset: number]
}>()

const editorRef = ref<HTMLDivElement>()
const isComposing = ref(false)

// Get cursor position
const getCursorPosition = (): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !editorRef.value) {
    return 0
  }
  
  const range = selection.getRangeAt(0)
  const preRange = range.cloneRange()
  preRange.selectNodeContents(editorRef.value)
  preRange.setEnd(range.endContainer, range.endOffset)
  
  return preRange.toString().length
}

// Set cursor position
const setCursorPosition = (offset: number) => {
  if (!editorRef.value) return
  
  const selection = window.getSelection()
  if (!selection) return
  
  const textNode = editorRef.value.firstChild || editorRef.value
  const range = document.createRange()
  
  try {
    if (textNode.nodeType === Node.TEXT_NODE) {
      const maxOffset = Math.min(offset, textNode.textContent?.length || 0)
      range.setStart(textNode, maxOffset)
      range.setEnd(textNode, maxOffset)
    } else {
      range.selectNodeContents(editorRef.value)
      range.collapse(true)
    }
    
    selection.removeAllRanges()
    selection.addRange(range)
  } catch (error) {
    // Failed to set cursor position
  }
}

// Handle input
const handleInput = (event: Event) => {
  if (isComposing.value) return
  if (!props.line) return
  
  const target = event.target as HTMLDivElement
  const newContent = target.textContent || ''
  const oldContent = (props.line?.content || '') as string
  
  if (newContent === oldContent) return
  
  // Simple content update for now
  emit('update:content', newContent)
}

// Handle keydown
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.line) return
  
  const cursorPos = getCursorPosition()
  const content = (props.line?.content || '') as string
  
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      emit('split-line', cursorPos)
      break
      
    case 'Backspace':
      if (cursorPos === 0 && content.length === 0) {
        event.preventDefault()
        emit('merge-with-previous')
      }
      break
      
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      // Let cursor move naturally, then report position
      nextTick(() => {
        const newPos = getCursorPosition()
        emit('cursor-change', newPos)
      })
      break
  }
}

// Handle composition (for IME)
const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = (event: CompositionEvent) => {
  isComposing.value = false
  handleInput(event)
}

// Handle focus/blur
const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

// Handle selection change
const handleSelectionChange = () => {
  if (editorRef.value && document.activeElement === editorRef.value) {
    const offset = getCursorPosition()
    emit('cursor-change', offset)
  }
}

// Focus the editor
const focus = () => {
  editorRef.value?.focus()
}

// Watch for external content changes
watch(() => props.line?.content, (newContent) => {
  if (!editorRef.value) return
  
  const currentContent = editorRef.value.textContent || ''
  if (currentContent !== newContent) {
    const cursorPos = getCursorPosition()
    editorRef.value.textContent = newContent as string
    
    // Restore cursor position if focused
    if (document.activeElement === editorRef.value) {
      nextTick(() => {
        setCursorPosition(Math.min(cursorPos, (newContent as string).length))
      })
    }
  }
})

// Setup selection change listener
onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)
  
  return () => {
    document.removeEventListener('selectionchange', handleSelectionChange)
  }
})

defineExpose({
  focus,
  setCursorPosition,
})
</script>

<template>
  <div
    class="line-editor group flex items-start gap-2 px-4 py-1 transition-colors"
    :class="{
      'bg-blue-50': isSelected,
      'hover:bg-gray-50': !isSelected,
    }"
  >
    <!-- Drag handle -->
    <div
      class="flex-shrink-0 w-5 h-5 mt-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      draggable="true"
    >
      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </div>
    
    <!-- Editor -->
    <div
      ref="editorRef"
      contenteditable="true"
      class="flex-1 min-h-[1.5rem] outline-none px-2 py-0.5 text-gray-800"
      :class="{
        'text-gray-400': !line?.content,
      }"
      :style="{
        caretColor: actorColor || 'auto',
      }"
      @input="handleInput"
      @keydown="handleKeydown"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
      @focus="handleFocus"
      @blur="handleBlur"
      v-text="line?.content || ''"
    />
    
    <!-- Line ID (debug) -->
    <div v-if="line?.id" class="flex-shrink-0 text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {{ (line.id as string).substring(0, 8) }}
    </div>
  </div>
</template>

<style scoped>
.line-editor [contenteditable]:focus {
  outline: none;
}

.line-editor [contenteditable]:empty:before {
  content: 'Type something...';
  color: rgb(156 163 175);
  pointer-events: none;
  position: absolute;
}
</style>