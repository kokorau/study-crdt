/**
 * Document Repository Implementation
 */

import * as Y from 'yjs'
import { ok, err, some, none } from '../../utils/fp'
import {
  createDocument,
} from '../../Domain/Entity'
import {
  createYjsDocumentStructure,
  fromYjsDocument,
  toYjsDocument,
} from '../Yjs/yjs-adapter'
import type { Result, Option } from '../../utils/fp'
import type {
  Document,
} from '../../Domain/Entity'
import type { DocumentId } from '../../Domain/ValueObject'

// リポジトリインターフェース（ドメイン層で定義されるべきだが、ここで再定義）
export type DocumentRepository = {
  readonly findById: (id: DocumentId) => Promise<Option<Document>>
  readonly save: (document: Document) => Promise<Result<void>>
  readonly delete: (id: DocumentId) => Promise<Result<void>>
  readonly create: (title?: string) => Promise<Result<Document>>
  readonly getYjsDoc: () => Y.Doc
  readonly subscribeToChanges: (callback: (document: Document) => void) => () => void
}

/**
 * Yjsベースのドキュメントリポジトリ実装
 */
export const createYjsDocumentRepository = (
  yjsDoc?: Y.Doc
): DocumentRepository => {
  const yjsStructure = createYjsDocumentStructure(yjsDoc)
  const changeCallbacks = new Set<(document: Document) => void>()
  
  // Yjsの変更を監視
  yjsStructure.doc.on('update', () => {
    const docResult = fromYjsDocument(yjsStructure)
    if (docResult.ok) {
      changeCallbacks.forEach(cb => cb(docResult.value))
    }
  })

  const findById = async (id: DocumentId): Promise<Option<Document>> => {
    const metadata = yjsStructure.metadata
    const storedId = metadata.get('id') as string
    
    if (storedId !== (id as string)) {
      return none()
    }

    const result = fromYjsDocument(yjsStructure)
    if (result.ok) {
      return some(result.value)
    }
    
    return none()
  }

  const save = async (document: Document): Promise<Result<void>> => {
    return toYjsDocument(document, yjsStructure)
  }

  const deleteDoc = async (id: DocumentId): Promise<Result<void>> => {
    const metadata = yjsStructure.metadata
    const storedId = metadata.get('id') as string
    
    if (storedId !== (id as string)) {
      return err(new Error('Document not found'))
    }

    yjsStructure.doc.transact(() => {
      yjsStructure.lines.delete(0, yjsStructure.lines.length)
      yjsStructure.contents.clear()
      yjsStructure.presence.clear()
      yjsStructure.metadata.clear()
    })

    return ok(undefined)
  }

  const create = async (title?: string): Promise<Result<Document>> => {
    const document = createDocument(title)
    const saveResult = await save(document)
    
    if (!saveResult.ok) {
      return saveResult
    }
    
    return ok(document)
  }

  const getYjsDoc = (): Y.Doc => {
    return yjsStructure.doc
  }

  const subscribeToChanges = (
    callback: (document: Document) => void
  ): (() => void) => {
    changeCallbacks.add(callback)
    
    return () => {
      changeCallbacks.delete(callback)
    }
  }

  return {
    findById,
    save,
    delete: deleteDoc,
    create,
    getYjsDoc,
    subscribeToChanges,
  }
}

/**
 * メモリベースのドキュメントリポジトリ（テスト用）
 */
export const createInMemoryDocumentRepository = (): DocumentRepository => {
  const documents = new Map<string, Document>()
  const yjsDoc = new Y.Doc()
  const changeCallbacks = new Set<(document: Document) => void>()

  const findById = async (id: DocumentId): Promise<Option<Document>> => {
    const doc = documents.get(id as string)
    return doc ? some(doc) : none()
  }

  const save = async (document: Document): Promise<Result<void>> => {
    documents.set(document.id as string, document)
    changeCallbacks.forEach(cb => cb(document))
    return ok(undefined)
  }

  const deleteDoc = async (id: DocumentId): Promise<Result<void>> => {
    const deleted = documents.delete(id as string)
    if (!deleted) {
      return err(new Error('Document not found'))
    }
    return ok(undefined)
  }

  const create = async (title?: string): Promise<Result<Document>> => {
    const document = createDocument(title)
    documents.set(document.id as string, document)
    return ok(document)
  }

  const getYjsDoc = (): Y.Doc => {
    return yjsDoc
  }

  const subscribeToChanges = (
    callback: (document: Document) => void
  ): (() => void) => {
    changeCallbacks.add(callback)
    
    return () => {
      changeCallbacks.delete(callback)
    }
  }

  return {
    findById,
    save,
    delete: deleteDoc,
    create,
    getYjsDoc,
    subscribeToChanges,
  }
}

/**
 * ローカルストレージベースのドキュメントリポジトリ
 */
export const createLocalStorageDocumentRepository = (
  storageKey: string = 'text-editor-documents',
  externalYjsDoc?: Y.Doc
): DocumentRepository => {
  const yjsDoc = externalYjsDoc || new Y.Doc()
  const yjsStructure = createYjsDocumentStructure(yjsDoc)
  const changeCallbacks = new Set<(document: Document) => void>()

  // ローカルストレージから復元
  const loadFromStorage = (): void => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const state = new Uint8Array(JSON.parse(stored))
        Y.applyUpdate(yjsDoc, state)
      } catch (error) {
        // Failed to load from localStorage
      }
    }
  }

  // ローカルストレージに保存
  const saveToStorage = (): void => {
    const state = Y.encodeStateAsUpdate(yjsDoc)
    localStorage.setItem(storageKey, JSON.stringify(Array.from(state)))
  }

  // 初期化時にロード
  loadFromStorage()

  // 変更時に保存
  yjsDoc.on('update', () => {
    saveToStorage()
    const docResult = fromYjsDocument(yjsStructure)
    if (docResult.ok) {
      changeCallbacks.forEach(cb => cb(docResult.value))
    }
  })

  const findById = async (id: DocumentId): Promise<Option<Document>> => {
    const metadata = yjsStructure.metadata
    const storedId = metadata.get('id') as string
    
    if (storedId !== (id as string)) {
      return none()
    }

    const result = fromYjsDocument(yjsStructure)
    if (result.ok) {
      return some(result.value)
    }
    
    return none()
  }

  const save = async (document: Document): Promise<Result<void>> => {
    const result = toYjsDocument(document, yjsStructure)
    if (result.ok) {
      saveToStorage()
    }
    return result
  }

  const deleteDoc = async (id: DocumentId): Promise<Result<void>> => {
    const metadata = yjsStructure.metadata
    const storedId = metadata.get('id') as string
    
    if (storedId !== (id as string)) {
      return err(new Error('Document not found'))
    }

    yjsDoc.transact(() => {
      yjsStructure.lines.delete(0, yjsStructure.lines.length)
      yjsStructure.contents.clear()
      yjsStructure.presence.clear()
      yjsStructure.metadata.clear()
    })

    saveToStorage()
    return ok(undefined)
  }

  const create = async (title?: string): Promise<Result<Document>> => {
    const document = createDocument(title)
    const saveResult = await save(document)
    
    if (!saveResult.ok) {
      return saveResult
    }
    
    return ok(document)
  }

  const getYjsDoc = (): Y.Doc => {
    return yjsDoc
  }

  const subscribeToChanges = (
    callback: (document: Document) => void
  ): (() => void) => {
    changeCallbacks.add(callback)
    
    return () => {
      changeCallbacks.delete(callback)
    }
  }

  return {
    findById,
    save,
    delete: deleteDoc,
    create,
    getYjsDoc,
    subscribeToChanges,
  }
}