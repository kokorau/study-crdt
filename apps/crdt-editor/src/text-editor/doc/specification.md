# Text Editor 仕様書

## 1. 概要

Yjsを使用した共同編集可能なテキストエディタの実装仕様。
Notion風の行ベースのエディタとして、複数のアクターが同時に編集可能な環境を提供する。

## 2. 機能要件

### 2.1 基本機能

#### 2.1.1 テキスト編集
- 各行は独立したブロックとして管理
- 行内のテキスト編集が可能
- リアルタイムでの文字入力・削除

#### 2.1.2 行管理
- 行の追加（Enter キー）
- 行の削除（Backspace キー on 空行）
- 行の並び替え（ドラッグ&ドロップ）
- 行の分割（行の途中でEnter）
- 行の結合（行頭でBackspace）

#### 2.1.3 共同編集
- 複数アクターの同時編集
- リアルタイム同期
- 編集競合の自動解決（CRDT）
- アクターごとのカーソル表示
- アクターごとの選択範囲表示

### 2.2 アクター管理

#### 2.2.1 アクター識別
- 一意のアクターID（UUID）
- アクター名
- アクターカラー（視覚的識別）

#### 2.2.2 プレゼンス
- オンラインアクターのリスト表示
- アクターのカーソル位置
- アクターの選択範囲
- アクターの編集状態（アイドル/編集中）

### 2.3 同期機能

#### 2.3.1 ローカル同期
- 同一ブラウザ内の複数タブ/ウィンドウ間同期
- BroadcastChannel APIの使用

#### 2.3.2 将来の拡張（Phase 2）
- WebRTC による P2P 同期
- WebSocket によるサーバー経由同期
- オフライン編集とマージ

## 3. データモデル

### 3.1 ドメインモデル

#### 3.1.1 Document
```typescript
type DocumentId = string & { readonly _brand: 'DocumentId' }

type Document = {
  readonly id: DocumentId
  readonly title: string
  readonly lines: readonly Line[]
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

#### 3.1.2 Line
```typescript
type LineId = string & { readonly _brand: 'LineId' }
type LineContent = string
type LineOrder = number & { readonly _brand: 'LineOrder' }

type Line = {
  readonly id: LineId
  readonly content: LineContent
  readonly order: LineOrder
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

#### 3.1.3 Actor
```typescript
type ActorId = string & { readonly _brand: 'ActorId' }
type ActorName = string
type ActorColor = string // hex color

type Actor = {
  readonly id: ActorId
  readonly name: ActorName
  readonly color: ActorColor
  readonly isLocal: boolean
}
```

#### 3.1.4 Cursor
```typescript
type CursorPosition = {
  readonly lineId: LineId
  readonly offset: number // 行内の文字位置
}

type Cursor = {
  readonly actorId: ActorId
  readonly position: CursorPosition
  readonly timestamp: Date
}
```

#### 3.1.5 Selection
```typescript
type SelectionRange = {
  readonly start: CursorPosition
  readonly end: CursorPosition
}

type Selection = {
  readonly actorId: ActorId
  readonly range: SelectionRange
  readonly timestamp: Date
}
```

### 3.2 Yjsデータ構造

#### 3.2.1 Y.Doc構造
```typescript
// Yjsドキュメントの構造
type YjsDocument = {
  lines: Y.Array<{
    id: string
    order: number
  }>
  contents: Y.Map<Y.Text> // key: LineId, value: Y.Text
  presence: Y.Map<{
    cursor?: CursorPosition
    selection?: SelectionRange
    actor: Actor
  }>
}
```

#### 3.2.2 データマッピング
- `lines`: 行の順序管理用のY.Array
- `contents`: 各行のテキスト内容を管理するY.Map
- `presence`: アクターのプレゼンス情報

## 4. 操作仕様

### 4.1 編集操作

#### 4.1.1 テキスト入力
```typescript
type InsertTextOperation = {
  readonly type: 'insert-text'
  readonly lineId: LineId
  readonly offset: number
  readonly text: string
  readonly actorId: ActorId
}
```

#### 4.1.2 テキスト削除
```typescript
type DeleteTextOperation = {
  readonly type: 'delete-text'
  readonly lineId: LineId
  readonly offset: number
  readonly length: number
  readonly actorId: ActorId
}
```

#### 4.1.3 行追加
```typescript
type AddLineOperation = {
  readonly type: 'add-line'
  readonly line: Line
  readonly afterLineId?: LineId
  readonly actorId: ActorId
}
```

#### 4.1.4 行削除
```typescript
type DeleteLineOperation = {
  readonly type: 'delete-line'
  readonly lineId: LineId
  readonly actorId: ActorId
}
```

#### 4.1.5 行移動
```typescript
type MoveLineOperation = {
  readonly type: 'move-line'
  readonly lineId: LineId
  readonly targetOrder: LineOrder
  readonly actorId: ActorId
}
```

### 4.2 イベント

#### 4.2.1 ドメインイベント
```typescript
type DomainEvent = 
  | TextInsertedEvent
  | TextDeletedEvent
  | LineAddedEvent
  | LineDeletedEvent
  | LineMovedEvent
  | CursorMovedEvent
  | SelectionChangedEvent
  | ActorJoinedEvent
  | ActorLeftEvent
```

#### 4.2.2 同期イベント
```typescript
type SyncEvent =
  | { readonly type: 'sync-started' }
  | { readonly type: 'sync-completed' }
  | { readonly type: 'sync-failed'; readonly error: Error }
  | { readonly type: 'conflict-resolved'; readonly resolution: ConflictResolution }
```

## 5. UI/UX仕様

### 5.1 エディタUI

#### 5.1.1 レイアウト
- 最大幅: 800px（中央寄せ）
- 行の高さ: 自動（コンテンツに応じて）
- 行間: 8px
- パディング: 左右 16px

#### 5.1.2 行の表示
- ホバー時: 背景色変更、ドラッグハンドル表示
- 選択時: ボーダー表示
- 編集中: フォーカスリング表示

#### 5.1.3 カーソル表示
- ローカルカーソル: 標準の点滅カーソル
- リモートカーソル: アクターカラーの縦線
- カーソルラベル: アクター名表示（ホバー時）

### 5.2 インタラクション

#### 5.2.1 キーボード操作
| キー | 動作 |
|------|------|
| Enter | 新しい行を追加（現在の行の下） |
| Shift + Enter | 行内改行（将来実装） |
| Backspace | 空行の場合は行削除、それ以外は文字削除 |
| Delete | 文字削除 |
| Arrow Keys | カーソル移動 |
| Cmd/Ctrl + A | 全選択 |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |

#### 5.2.2 マウス操作
- クリック: カーソル位置設定
- ダブルクリック: 単語選択
- トリプルクリック: 行選択
- ドラッグ: テキスト選択
- 行ハンドルドラッグ: 行の並び替え

### 5.3 パフォーマンス要件

#### 5.3.1 レスポンス時間
- ローカル操作: < 16ms（60fps）
- 同期遅延: < 100ms（ローカルネットワーク）
- 初期ロード: < 1000ms

#### 5.3.2 スケーラビリティ
- 最大行数: 10,000行
- 最大同時編集者: 10人
- 最大ドキュメントサイズ: 10MB

## 6. エラーハンドリング

### 6.1 同期エラー
- 一時的な切断: 自動再接続（exponential backoff）
- 永続的な切断: オフラインモード移行
- データ不整合: 最終書き込み優先（LWW）

### 6.2 操作エラー
- 無効な操作: 操作を無視、エラーログ記録
- 権限エラー: ユーザーに通知（将来実装）

## 7. セキュリティ考慮事項

### 7.1 入力検証
- XSS対策: HTMLエスケープ
- 最大文字数制限: 1行あたり10,000文字
- 禁止文字のフィルタリング

### 7.2 通信セキュリティ（将来実装）
- WebRTC: DTLS暗号化
- WebSocket: WSS（TLS）使用

## 8. テスト要件

### 8.1 単体テスト
- ドメインロジックの純粋関数
- 操作の適用と検証
- エラーケースの処理

### 8.2 統合テスト
- Yjs同期の動作確認
- 複数アクターのシミュレーション
- 競合解決のテスト

### 8.3 E2Eテスト
- ユーザー操作フロー
- 同期シナリオ
- エラー復旧シナリオ

## 9. 実装フェーズ

### Phase 1: 基本実装（現在）
- [ ] ドメインモデル実装
- [ ] 基本的な編集操作
- [ ] Yjsによるローカル同期
- [ ] シンプルなUI

### Phase 2: 共同編集機能
- [ ] アクタープレゼンス
- [ ] カーソル・選択範囲の共有
- [ ] WebRTC/WebSocket同期

### Phase 3: 拡張機能
- [ ] Undo/Redo
- [ ] リッチテキスト（太字、斜体など）
- [ ] ブロックタイプ（見出し、リストなど）
- [ ] 永続化とバックアップ