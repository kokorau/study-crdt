/**
 * Text Editor Composable
 */

import { computed, onMounted, onUnmounted, reactive } from 'vue'
import {
  createLocalStorageDocumentRepository,
  createEditorUseCases,
  createLocalSyncProvider,
  createActorIdManager,
  createActor,
  createActorId,
  createDocumentId,
} from '../text-editor'
import type {
  Document,
  Line,
  Actor,
  LineId,
  CursorPosition,
  SelectionRange,
} from '../text-editor'

export type EditorState = {
  document: Document | null
  actors: Map<string, Actor>
  localActor: Actor | null
  cursors: Map<string, CursorPosition>
  selections: Map<string, SelectionRange>
  isConnected: boolean
  isSyncing: boolean
}

export type UseTextEditorOptions = {
  documentId?: string
  actorName?: string
  actorColor?: string
  channelName?: string
  storageKey?: string
}

export const useTextEditor = (options: UseTextEditorOptions = {}) => {
  // State
  const state = reactive<EditorState>({
    document: null,
    actors: new Map(),
    localActor: null,
    cursors: new Map(),
    selections: new Map(),
    isConnected: false,
    isSyncing: false,
  })

  // Repository and Use Cases
  const repository = createLocalStorageDocumentRepository(
    options.storageKey || 'text-editor-doc'
  )
  const useCases = createEditorUseCases(repository)
  
  // Actor management
  const actorIdManager = createActorIdManager()
  
  // Sync provider
  let syncProvider: ReturnType<typeof createLocalSyncProvider> | null = null
  let unsubscribeChanges: (() => void) | null = null

  // Computed
  const sortedLines = computed(() => {
    if (!state.document) return []
    return [...state.document.lines].sort((a, b) => (a.order as number) - (b.order as number))
  })

  const onlineActors = computed(() => {
    return Array.from(state.actors.values()).filter(a => !a.isLocal)
  })

  // Initialize editor
  const initialize = async () => {
    // Create or load local actor
    const actorIdStr = actorIdManager.getLocalActorId()
    const actorResult = createActor(
      options.actorName || 'User',
      options.actorColor,
      true
    )
    
    if (actorResult.ok) {
      state.localActor = {
        ...actorResult.value,
        id: createActorId(actorIdStr),
      }
      state.actors.set(actorIdStr, state.localActor)
    }

    // Create or load document
    let document: Document | null = null
    
    if (options.documentId) {
      const docOption = await repository.findById(createDocumentId(options.documentId))
      if (docOption.some) {
        document = docOption.value
      }
    }
    
    if (!document) {
      const createResult = await useCases.createDocument({
        title: 'Collaborative Document',
        actorId: state.localActor!.id,
      })
      
      if (createResult.ok) {
        document = createResult.value
        
        // Add initial line
        const addLineResult = await useCases.addLine({
          documentId: document.id,
          content: '',
          actorId: state.localActor!.id,
        })
        
        if (addLineResult.ok) {
          document = addLineResult.value
        }
      }
    }
    
    state.document = document

    // Subscribe to document changes
    unsubscribeChanges = repository.subscribeToChanges((doc) => {
      state.document = doc
    })

    // Setup sync provider
    const yjsDoc = repository.getYjsDoc()
    syncProvider = createLocalSyncProvider({
      channelName: options.channelName || `text-editor-${document?.id}`,
      doc: yjsDoc,
      onSync: () => {
        state.isSyncing = false
      },
      onError: () => {
        // Sync error
        state.isSyncing = false
      },
    })

    // Connect sync
    const connectResult = syncProvider.connect()
    if (connectResult.ok) {
      state.isConnected = true
    }
  }

  // Text operations
  const insertText = async (lineId: LineId, offset: number, text: string) => {
    if (!state.document || !state.localActor) return
    
    state.isSyncing = true
    const result = await useCases.insertText({
      documentId: state.document.id,
      lineId,
      offset,
      text,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
    }
    state.isSyncing = false
  }

  const deleteText = async (lineId: LineId, offset: number, length: number) => {
    if (!state.document || !state.localActor) return
    
    state.isSyncing = true
    const result = await useCases.deleteText({
      documentId: state.document.id,
      lineId,
      offset,
      length,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
    }
    state.isSyncing = false
  }

  const updateLineContent = async (lineId: LineId, content: string) => {
    if (!state.document || !state.localActor) return
    
    state.isSyncing = true
    const result = await useCases.updateLineContent({
      documentId: state.document.id,
      lineId,
      content,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
    }
    state.isSyncing = false
  }

  // Line operations
  const addLine = async (content: string = '', afterLineId?: LineId) => {
    if (!state.document || !state.localActor) return
    
    state.isSyncing = true
    const result = await useCases.addLine({
      documentId: state.document.id,
      content,
      afterLineId,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
      return result.value.lines[result.value.lines.length - 1]
    }
    state.isSyncing = false
    return null
  }

  const removeLine = async (lineId: LineId) => {
    if (!state.document || !state.localActor) return
    
    // Don't remove the last line
    if (state.document.lines.length <= 1) return
    
    state.isSyncing = true
    const result = await useCases.removeLine({
      documentId: state.document.id,
      lineId,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
    }
    state.isSyncing = false
  }

  const splitLine = async (lineId: LineId, offset: number) => {
    if (!state.document || !state.localActor) return
    
    state.isSyncing = true
    const result = await useCases.splitLineAtOffset({
      documentId: state.document.id,
      lineId,
      offset,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
      // Return the new line (should be after the split line)
      const lineIndex = result.value.lines.findIndex(l => l.id === lineId)
      if (lineIndex >= 0 && lineIndex < result.value.lines.length - 1) {
        return result.value.lines[lineIndex + 1]
      }
    }
    state.isSyncing = false
    return null
  }

  const mergeWithPreviousLine = async (lineId: LineId) => {
    if (!state.document || !state.localActor) return
    
    const lineIndex = state.document.lines.findIndex(l => l.id === lineId)
    if (lineIndex <= 0) return // Can't merge first line
    
    const previousLine = state.document.lines[lineIndex - 1]
    const previousLength = (previousLine.content as string).length
    
    state.isSyncing = true
    const result = await useCases.mergeLines({
      documentId: state.document.id,
      firstLineId: previousLine.id,
      secondLineId: lineId,
      actorId: state.localActor.id,
    })
    
    if (result.ok) {
      state.document = result.value
      return { lineId: previousLine.id, offset: previousLength }
    }
    state.isSyncing = false
    return null
  }

  // Cursor and selection management
  const updateLocalCursor = (position: CursorPosition) => {
    if (!state.localActor) return
    state.cursors.set(state.localActor.id as string, position)
  }

  const updateLocalSelection = (range: SelectionRange | null) => {
    if (!state.localActor) return
    
    if (range) {
      state.selections.set(state.localActor.id as string, range)
    } else {
      state.selections.delete(state.localActor.id as string)
    }
  }

  // Line helpers
  const getLineById = (lineId: LineId): Line | undefined => {
    if (!state.document) return undefined
    return state.document.lines.find(l => l.id === lineId)
  }

  const getLineByIndex = (index: number): Line | undefined => {
    return sortedLines.value[index]
  }

  const getNextLine = (lineId: LineId): Line | undefined => {
    const index = sortedLines.value.findIndex(l => l.id === lineId)
    if (index >= 0 && index < sortedLines.value.length - 1) {
      return sortedLines.value[index + 1]
    }
    return undefined
  }

  const getPreviousLine = (lineId: LineId): Line | undefined => {
    const index = sortedLines.value.findIndex(l => l.id === lineId)
    if (index > 0) {
      return sortedLines.value[index - 1]
    }
    return undefined
  }

  // Cleanup
  const destroy = () => {
    if (syncProvider) {
      syncProvider.disconnect()
      syncProvider.destroy()
    }
    if (unsubscribeChanges) {
      unsubscribeChanges()
    }
  }

  // Lifecycle
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    // State
    state,
    sortedLines,
    onlineActors,
    
    // Text operations
    insertText,
    deleteText,
    updateLineContent,
    
    // Line operations
    addLine,
    removeLine,
    splitLine,
    mergeWithPreviousLine,
    
    // Cursor and selection
    updateLocalCursor,
    updateLocalSelection,
    
    // Line helpers
    getLineById,
    getLineByIndex,
    getNextLine,
    getPreviousLine,
    
    // Lifecycle
    destroy,
  }
}