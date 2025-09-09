/**
 * Yjs Adapter - ドメインモデルとYjsの相互変換
 */

import * as Y from 'yjs'
import { ok, err } from '../../utils/fp'
import {
  createLineWithId,
  createActorWithId,
} from '../../Domain/Entity'
import {
  createDocumentId,
  createLineId,
} from '../../Domain/ValueObject'
import type { Result } from '../../utils/fp'
import type {
  Document,
  Line,
  Actor,
} from '../../Domain/Entity'
import type {
  LineId,
  CursorPosition,
  SelectionRange,
} from '../../Domain/ValueObject'

// Yjs型定義
export type YjsLineData = {
  id: string
  order: number
}

export type YjsActorData = {
  id: string
  name: string
  color: string
  isLocal: boolean
  joinedAt: number
  lastSeenAt: number
}

export type YjsPresenceData = {
  cursor?: {
    lineId: string
    offset: number
  }
  selection?: {
    start: { lineId: string; offset: number }
    end: { lineId: string; offset: number }
  }
  actor: YjsActorData
}

// Yjs Document構造
export type YjsDocumentStructure = {
  readonly doc: Y.Doc
  readonly lines: Y.Array<YjsLineData>
  readonly contents: Y.Map<Y.Text>
  readonly presence: Y.Map<YjsPresenceData>
  readonly metadata: Y.Map<any>
}

/**
 * YjsドキュメントをDomain Documentに変換
 */
export const fromYjsDocument = (
  yjsDoc: YjsDocumentStructure
): Result<Document> => {
  try {
    const metadata = yjsDoc.metadata
    const documentId = metadata.get('id') as string
    const title = metadata.get('title') as string || 'Untitled'
    const version = metadata.get('version') as number || 0
    const createdAt = new Date(metadata.get('createdAt') as string)
    const updatedAt = new Date(metadata.get('updatedAt') as string)

    if (!documentId) {
      return err(new Error('Document ID not found in Yjs document'))
    }

    // Lines を変換
    const linesArray = yjsDoc.lines.toArray()
    const lines: Line[] = []

    for (const lineData of linesArray) {
      const content = yjsDoc.contents.get(lineData.id)
      if (!content) {
        return err(new Error(`Content not found for line ${lineData.id}`))
      }

      const lineResult = createLineWithId(
        lineData.id,
        content.toString(),
        lineData.order
      )

      if (!lineResult.ok) {
        return lineResult
      }

      lines.push(lineResult.value)
    }

    // ソート
    lines.sort((a, b) => (a.order as number) - (b.order as number))

    const document: Document = {
      id: createDocumentId(documentId),
      title,
      lines,
      version,
      createdAt,
      updatedAt,
    }

    return ok(document)
  } catch (error) {
    return err(new Error(`Failed to convert from Yjs: ${error}`))
  }
}

/**
 * Domain DocumentをYjsに反映
 */
export const toYjsDocument = (
  document: Document,
  yjsDoc: YjsDocumentStructure
): Result<void> => {
  try {
    yjsDoc.doc.transact(() => {
      // メタデータ更新
      const metadata = yjsDoc.metadata
      metadata.set('id', document.id)
      metadata.set('title', document.title)
      metadata.set('version', document.version)
      metadata.set('createdAt', document.createdAt.toISOString())
      metadata.set('updatedAt', document.updatedAt.toISOString())

      // 既存の行をクリア
      yjsDoc.lines.delete(0, yjsDoc.lines.length)
      
      // 新しい行を追加
      for (const line of document.lines) {
        const lineData: YjsLineData = {
          id: line.id as string,
          order: line.order as number,
        }
        
        yjsDoc.lines.push([lineData])
        
        // コンテンツを設定
        let content = yjsDoc.contents.get(line.id as string)
        if (!content) {
          content = new Y.Text()
          yjsDoc.contents.set(line.id as string, content)
        }
        
        // 既存のテキストをクリアして新しいテキストを設定
        content.delete(0, content.length)
        content.insert(0, line.content as string)
      }
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to convert to Yjs: ${error}`))
  }
}

/**
 * Yjs ActorをDomain Actorに変換
 */
export const fromYjsActor = (yjsActor: YjsActorData): Result<Actor> => {
  return createActorWithId(
    yjsActor.id,
    yjsActor.name,
    yjsActor.color,
    yjsActor.isLocal
  )
}

/**
 * Domain ActorをYjs形式に変換
 */
export const toYjsActor = (actor: Actor): YjsActorData => {
  return {
    id: actor.id as string,
    name: actor.name as string,
    color: actor.color as string,
    isLocal: actor.isLocal,
    joinedAt: actor.joinedAt.getTime(),
    lastSeenAt: actor.lastSeenAt.getTime(),
  }
}

/**
 * YjsカーソルをDomain CursorPositionに変換
 */
export const fromYjsCursor = (
  yjsCursor: { lineId: string; offset: number }
): CursorPosition => {
  return {
    lineId: createLineId(yjsCursor.lineId),
    offset: yjsCursor.offset as any,
  }
}

/**
 * Domain CursorPositionをYjs形式に変換
 */
export const toYjsCursor = (
  cursor: CursorPosition
): { lineId: string; offset: number } => {
  return {
    lineId: cursor.lineId as string,
    offset: cursor.offset as number,
  }
}

/**
 * Yjs選択範囲をDomain SelectionRangeに変換
 */
export const fromYjsSelection = (
  yjsSelection: {
    start: { lineId: string; offset: number }
    end: { lineId: string; offset: number }
  }
): SelectionRange => {
  return {
    start: fromYjsCursor(yjsSelection.start),
    end: fromYjsCursor(yjsSelection.end),
  }
}

/**
 * Domain SelectionRangeをYjs形式に変換
 */
export const toYjsSelection = (
  selection: SelectionRange
): {
  start: { lineId: string; offset: number }
  end: { lineId: string; offset: number }
} => {
  return {
    start: toYjsCursor(selection.start),
    end: toYjsCursor(selection.end),
  }
}

/**
 * 新しいYjsドキュメント構造を作成
 */
export const createYjsDocumentStructure = (
  doc: Y.Doc = new Y.Doc()
): YjsDocumentStructure => {
  const lines = doc.getArray<YjsLineData>('lines')
  const contents = doc.getMap<Y.Text>('contents')
  const presence = doc.getMap<YjsPresenceData>('presence')
  const metadata = doc.getMap('metadata')

  return {
    doc,
    lines,
    contents,
    presence,
    metadata,
  }
}

/**
 * LineをYjsに追加
 */
export const addLineToYjs = (
  yjsDoc: YjsDocumentStructure,
  line: Line,
  index?: number
): Result<void> => {
  try {
    yjsDoc.doc.transact(() => {
      const lineData: YjsLineData = {
        id: line.id as string,
        order: line.order as number,
      }

      if (index !== undefined && index >= 0 && index <= yjsDoc.lines.length) {
        yjsDoc.lines.insert(index, [lineData])
      } else {
        yjsDoc.lines.push([lineData])
      }

      const content = new Y.Text()
      content.insert(0, line.content as string)
      yjsDoc.contents.set(line.id as string, content)
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to add line to Yjs: ${error}`))
  }
}

/**
 * YjsからLineを削除
 */
export const removeLineFromYjs = (
  yjsDoc: YjsDocumentStructure,
  lineId: LineId
): Result<void> => {
  try {
    yjsDoc.doc.transact(() => {
      // linesから削除
      const index = yjsDoc.lines.toArray().findIndex(
        l => l.id === (lineId as string)
      )
      
      if (index !== -1) {
        yjsDoc.lines.delete(index, 1)
      }

      // contentsから削除
      yjsDoc.contents.delete(lineId as string)
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to remove line from Yjs: ${error}`))
  }
}

/**
 * Yjsのテキストを更新
 */
export const updateYjsText = (
  yjsDoc: YjsDocumentStructure,
  lineId: LineId,
  newContent: string
): Result<void> => {
  try {
    const text = yjsDoc.contents.get(lineId as string)
    if (!text) {
      return err(new Error(`Line ${lineId} not found in Yjs`))
    }

    yjsDoc.doc.transact(() => {
      text.delete(0, text.length)
      text.insert(0, newContent)
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to update text in Yjs: ${error}`))
  }
}

/**
 * Yjsのテキストに挿入
 */
export const insertTextInYjs = (
  yjsDoc: YjsDocumentStructure,
  lineId: LineId,
  offset: number,
  text: string
): Result<void> => {
  try {
    const yText = yjsDoc.contents.get(lineId as string)
    if (!yText) {
      return err(new Error(`Line ${lineId} not found in Yjs`))
    }

    yjsDoc.doc.transact(() => {
      yText.insert(offset, text)
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to insert text in Yjs: ${error}`))
  }
}

/**
 * Yjsのテキストから削除
 */
export const deleteTextFromYjs = (
  yjsDoc: YjsDocumentStructure,
  lineId: LineId,
  offset: number,
  length: number
): Result<void> => {
  try {
    const text = yjsDoc.contents.get(lineId as string)
    if (!text) {
      return err(new Error(`Line ${lineId} not found in Yjs`))
    }

    yjsDoc.doc.transact(() => {
      text.delete(offset, length)
    })

    return ok(undefined)
  } catch (error) {
    return err(new Error(`Failed to delete text from Yjs: ${error}`))
  }
}