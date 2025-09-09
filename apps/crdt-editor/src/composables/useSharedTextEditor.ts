/**
 * Shared Text Editor Composable
 * 
 * This composable creates a text editor instance that shares the same Yjs document
 * with other instances, enabling real-time collaboration.
 */

import { computed, onMounted, onUnmounted, reactive } from 'vue'
import * as Y from 'yjs'
import {
  createEditorUseCases,
  createLocalSyncProvider,
  createActorIdManager,
  createActor,
  createActorId,
} from '../text-editor'
import { 
  createYjsDocumentStructure,
  fromYjsDocument,
  toYjsDocument,
} from '../text-editor/Infrastructure/Yjs/yjs-adapter'
import type {
  Document,
  Actor,
  LineId,
  CursorPosition,
  SelectionRange,
} from '../text-editor'

// Shared Yjs document instance
let sharedYDoc: Y.Doc | null = null
let sharedDocumentId: string | null = null
let instanceCount = 0

export type EditorState = {
  document: Document | null
  actors: Map<string, Actor>
  localActor: Actor | null
  cursors: Map<string, CursorPosition>
  selections: Map<string, SelectionRange>
  isConnected: boolean
  isSyncing: boolean
}

export type UseSharedTextEditorOptions = {
  actorName?: string
  actorColor?: string
  channelName?: string
}

export const useSharedTextEditor = (options: UseSharedTextEditorOptions = {}) => {
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

  // Create shared Yjs document if it doesn't exist
  if (!sharedYDoc) {
    sharedYDoc = new Y.Doc()
    sharedDocumentId = `shared-doc-${Date.now()}`
  }
  instanceCount++

  // Create Yjs document structure
  const yjsDocStructure = createYjsDocumentStructure(sharedYDoc)
  
  // Track document changes
  let currentDocument: Document | null = null
  const changeCallbacks: Array<(doc: Document) => void> = []
  
  // Create a custom repository that uses the shared Yjs document
  const repository = {
    findById: async (id: any) => {
      const result = fromYjsDocument(yjsDocStructure)
      if (result.ok && result.value.id === id) {
        return { some: true, value: result.value, none: false }
      }
      return { some: false, value: null, none: true }
    },
    save: async (document: Document) => {
      const result = toYjsDocument(document, yjsDocStructure)
      if (result.ok) {
        currentDocument = document
        changeCallbacks.forEach(cb => cb(document))
        return { ok: true, value: document, error: null }
      }
      return { ok: false, value: null, error: result.error }
    },
    subscribeToChanges: (callback: (doc: Document) => void) => {
      changeCallbacks.push(callback)
      
      // Subscribe to Yjs changes
      const observer = () => {
        const result = fromYjsDocument(yjsDocStructure)
        if (result.ok) {
          currentDocument = result.value
          callback(result.value)
        }
      }
      
      yjsDocStructure.lines.observe(observer)
      yjsDocStructure.contents.observe(observer)
      
      return () => {
        yjsDocStructure.lines.unobserve(observer)
        yjsDocStructure.contents.unobserve(observer)
        const index = changeCallbacks.indexOf(callback)
        if (index >= 0) changeCallbacks.splice(index, 1)
      }
    },
    getYjsDoc: () => sharedYDoc!
  }

  const useCases = createEditorUseCases(repository as any)
  
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
    const actorIdStr = `${actorIdManager.getLocalActorId()}-${instanceCount}`
    const actorResult = createActor(
      options.actorName || `User ${instanceCount}`,
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
    const yjsResult = fromYjsDocument(yjsDocStructure)
    let document = currentDocument || (yjsResult.ok ? yjsResult.value : null)
    
    if (!document && sharedDocumentId) {
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
    syncProvider = createLocalSyncProvider({
      channelName: options.channelName || `shared-text-editor`,
      doc: sharedYDoc!,
      onSync: () => {
        state.isSyncing = false
      },
      onError: () => {
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
  const splitLine = async (lineId: LineId, offset: number) => {
    if (!state.document || !state.localActor) return null
    
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
        state.isSyncing = false
        return result.value.lines[lineIndex + 1]
      }
    }
    state.isSyncing = false
    return null
  }

  const mergeWithPreviousLine = async (lineId: LineId) => {
    if (!state.document || !state.localActor) return null
    
    const lineIndex = state.document.lines.findIndex(l => l.id === lineId)
    if (lineIndex <= 0) return null
    
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
      state.isSyncing = false
      return { lineId: previousLine.id, offset: previousLength }
    }
    state.isSyncing = false
    return null
  }

  // Cursor management
  const updateLocalCursor = (position: CursorPosition) => {
    if (!state.localActor) return
    state.cursors.set(state.localActor.id as string, position)
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
    
    // Decrease instance count and clean up shared doc if no more instances
    instanceCount--
    if (instanceCount === 0) {
      sharedYDoc?.destroy()
      sharedYDoc = null
      sharedDocumentId = null
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
    
    // Operations
    updateLineContent,
    splitLine,
    mergeWithPreviousLine,
    updateLocalCursor,
    
    // Lifecycle
    destroy,
  }
}