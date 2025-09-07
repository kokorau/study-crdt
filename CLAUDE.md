# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

注意: このプロジェクトでは日本語での応答を想定しています。

## プロジェクト概要

CRDT（Conflict-free Replicated Data Type）の学習プロジェクトで、pnpm workspace を使用したモノレポ構成です。主要コンポーネント：

- **packages/myers-diff**: 文字列、配列、オブジェクトに対応した汎用Myers差分アルゴリズムのTypeScriptライブラリ
- **apps/crdt-editor**: Vite + Tailwind CSSで構築されたVue 3 + TypeScript差分可視化フロントエンドアプリケーション

## アーキテクチャ

myers-diffパッケージではドメイン駆動設計の原則に従っています：
- コアコンセプトのValue Object（Patch、Span、Comparer）
- 文字列と配列操作の統一APIを`$Patch`名前空間で提供
- `Comparers`ファクトリによる柔軟な比較戦略

Vueアプリは以下を使用：
- Vue 3 Composition API（`<script setup>`）
- Vue Router（ナビゲーション）
- Tailwind CSS（スタイリング）
- 差分可視化用カスタムコンポーネント

## よく使用するコマンド

### 開発
```bash
# Vueアプリの開発サーバー起動
pnpm dev

# myers-diffパッケージのwatchモード
pnpm --filter '@study-crdt/myers-diff' run dev
```

### ビルド
```bash
# 全パッケージ・アプリをビルド
pnpm build

# パッケージのみビルド
pnpm build:packages

# アプリのみビルド
pnpm build:apps
```

### テスト
```bash
# myers-diffパッケージのテスト実行
pnpm --filter '@study-crdt/myers-diff' run test

# Vueアプリのテスト実行
pnpm --filter 'crdt-editor' run test
```

## パッケージ依存関係

myers-diffパッケージ：
- TypeScript（tsgoでコンパイル）
- Bunテスト環境
- ランタイム依存なし（純粋実装）

Vueアプリ：
- `@study-crdt/myers-diff`（workspace依存）
- Vue 3、Vue Router、Tailwind CSS、Vite

## 重要なファイル

- `packages/myers-diff/src/Domain/ValueObject/` - コアドメインオブジェクト
- `apps/crdt-editor/src/components/MyersDiff/` - 差分可視化コンポーネント
- `apps/crdt-editor/src/pages/TextDiff.vue` - メイン差分デモページ