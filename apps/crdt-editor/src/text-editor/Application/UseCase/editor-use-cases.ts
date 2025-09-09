/**
 * Editor Use Cases - アプリケーションロジック
 */

import { ok, err } from '../../utils/fp'
import {
  addLineToDocument,
  removeLineFromDocument,
  updateLineInDocument,
  insertTextInLine,
  deleteTextFromLine,
  splitLine,
  mergeLine,
} from '../../Domain/Entity'
import type { AsyncResult } from '../../utils/fp'
import type {
  Document,
} from '../../Domain/Entity'
import type {
  DocumentId,
  LineId,
  ActorId,
} from '../../Domain/ValueObject'
import type { DocumentRepository } from '../../Infrastructure/Repository/document-repository'

// UseCase入力型
export type CreateDocumentInput = {
  readonly title?: string
  readonly actorId: ActorId
}

export type AddLineInput = {
  readonly documentId: DocumentId
  readonly content: string
  readonly afterLineId?: LineId
  readonly actorId: ActorId
}

export type RemoveLineInput = {
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly actorId: ActorId
}

export type UpdateLineContentInput = {
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly content: string
  readonly actorId: ActorId
}

export type InsertTextInput = {
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly offset: number
  readonly text: string
  readonly actorId: ActorId
}

export type DeleteTextInput = {
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly offset: number
  readonly length: number
  readonly actorId: ActorId
}

export type SplitLineInput = {
  readonly documentId: DocumentId
  readonly lineId: LineId
  readonly offset: number
  readonly actorId: ActorId
}

export type MergeLineInput = {
  readonly documentId: DocumentId
  readonly firstLineId: LineId
  readonly secondLineId: LineId
  readonly actorId: ActorId
}

// UseCase実装
export type EditorUseCases = {
  readonly createDocument: (input: CreateDocumentInput) => AsyncResult<Document>
  readonly addLine: (input: AddLineInput) => AsyncResult<Document>
  readonly removeLine: (input: RemoveLineInput) => AsyncResult<Document>
  readonly updateLineContent: (input: UpdateLineContentInput) => AsyncResult<Document>
  readonly insertText: (input: InsertTextInput) => AsyncResult<Document>
  readonly deleteText: (input: DeleteTextInput) => AsyncResult<Document>
  readonly splitLineAtOffset: (input: SplitLineInput) => AsyncResult<Document>
  readonly mergeLines: (input: MergeLineInput) => AsyncResult<Document>
  readonly getDocument: (id: DocumentId) => AsyncResult<Document>
}

/**
 * エディタUseCasesを作成
 */
export const createEditorUseCases = (
  repository: DocumentRepository
): EditorUseCases => {
  
  const createDocument = async (
    input: CreateDocumentInput
  ): AsyncResult<Document> => {
    return repository.create(input.title)
  }

  const addLine = async (input: AddLineInput): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const result = addLineToDocument(
      document,
      input.content,
      input.afterLineId
    )

    if (!result.ok) {
      return result
    }

    const saveResult = await repository.save(result.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(result.value)
  }

  const removeLine = async (
    input: RemoveLineInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const result = removeLineFromDocument(document, input.lineId)

    if (!result.ok) {
      return result
    }

    const saveResult = await repository.save(result.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(result.value)
  }

  const updateLineContent = async (
    input: UpdateLineContentInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const result = updateLineInDocument(
      document,
      input.lineId,
      line => ok({ ...line, content: input.content as any })
    )

    if (!result.ok) {
      return result
    }

    const saveResult = await repository.save(result.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(result.value)
  }

  const insertText = async (
    input: InsertTextInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const result = updateLineInDocument(
      document,
      input.lineId,
      line => insertTextInLine(line, input.offset, input.text)
    )

    if (!result.ok) {
      return result
    }

    const saveResult = await repository.save(result.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(result.value)
  }

  const deleteText = async (
    input: DeleteTextInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const result = updateLineInDocument(
      document,
      input.lineId,
      line => deleteTextFromLine(line, input.offset, input.length)
    )

    if (!result.ok) {
      return result
    }

    const saveResult = await repository.save(result.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(result.value)
  }

  const splitLineAtOffset = async (
    input: SplitLineInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const line = document.lines.find(l => l.id === input.lineId)
    
    if (!line) {
      return err(new Error('Line not found'))
    }

    const splitResult = splitLine(line, input.offset)
    if (!splitResult.ok) {
      return splitResult
    }

    // 元の行を更新
    let updatedDoc = document
    const updateResult = updateLineInDocument(
      updatedDoc,
      input.lineId,
      () => ok(splitResult.value.before)
    )

    if (!updateResult.ok) {
      return updateResult
    }
    updatedDoc = updateResult.value

    // 新しい行を追加
    const addResult = addLineToDocument(
      updatedDoc,
      splitResult.value.after.content as string,
      input.lineId
    )

    if (!addResult.ok) {
      return addResult
    }

    const saveResult = await repository.save(addResult.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(addResult.value)
  }

  const mergeLines = async (
    input: MergeLineInput
  ): AsyncResult<Document> => {
    const docOption = await repository.findById(input.documentId)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    const document = docOption.value
    const firstLine = document.lines.find(l => l.id === input.firstLineId)
    const secondLine = document.lines.find(l => l.id === input.secondLineId)
    
    if (!firstLine || !secondLine) {
      return err(new Error('Line not found'))
    }

    const mergeResult = mergeLine(firstLine, secondLine)
    if (!mergeResult.ok) {
      return mergeResult
    }

    // 最初の行を更新
    let updatedDoc = document
    const updateResult = updateLineInDocument(
      updatedDoc,
      input.firstLineId,
      () => ok(mergeResult.value)
    )

    if (!updateResult.ok) {
      return updateResult
    }
    updatedDoc = updateResult.value

    // 2番目の行を削除
    const removeResult = removeLineFromDocument(
      updatedDoc,
      input.secondLineId
    )

    if (!removeResult.ok) {
      return removeResult
    }

    const saveResult = await repository.save(removeResult.value)
    if (!saveResult.ok) {
      return saveResult
    }

    return ok(removeResult.value)
  }

  const getDocument = async (id: DocumentId): AsyncResult<Document> => {
    const docOption = await repository.findById(id)
    
    if (!docOption.some) {
      return err(new Error('Document not found'))
    }

    return ok(docOption.value)
  }

  return {
    createDocument,
    addLine,
    removeLine,
    updateLineContent,
    insertText,
    deleteText,
    splitLineAtOffset,
    mergeLines,
    getDocument,
  }
}