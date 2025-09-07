/**
 * 文字列専用のDiffユーティリティ
 * GenericSpanをベースに、既存APIとの互換性を保ちつつ移行をサポート
 */

import { $Patch, type Patch, type Span } from "./Span";
import { Comparers } from "./Comparer";

// 文字列用の型エイリアス
export type StringPatch = Patch<string>;
export type StringSpan = Span<string>;

/**
 * 文字列用Diffの統一API
 */
export const $StringDiff = {
  /**
   * 文字列から差分を作成（既存API互換）
   */
  createFromDiff(before: string, after: string): StringPatch {
    const beforeArray = before.split("");
    const afterArray = after.split("");
    const comparer = Comparers.strict<string>();
    
    return $Patch.createFromDiff(beforeArray, afterArray, comparer);
  },

  /**
   * パッチを文字列に適用（既存API互換）
   */
  apply(patch: StringPatch): string {
    const resultArray = $Patch.apply(patch);
    return resultArray.join("");
  },

  /**
   * 空パッチを作成（既存API互換）
   */
  create(patch: { baseVersion: string; spans: StringSpan[] }): StringPatch {
    return $Patch.create({
      baseVersion: patch.baseVersion.split(""),
      spans: patch.spans,
    });
  },

  /**
   * 編集距離を計算
   */
  getEditDistance(before: string, after: string): number {
    const beforeArray = before.split("");
    const afterArray = after.split("");
    const comparer = Comparers.strict<string>();
    
    return $Patch.getEditDistance(beforeArray, afterArray, comparer);
  },

  /**
   * パッチが最適パスかを判定
   */
  isOptimalPath(patch: StringPatch): boolean {
    const result = this.apply(patch);
    const baseVersion = patch.baseVersion.join("");
    
    // 実際の編集距離を計算
    const actualDistance = patch.spans.reduce((acc, span) => {
      if (span.type === "delete") return acc + span.count;
      if (span.type === "insert") return acc + span.items.length;
      return acc;
    }, 0);

    // 最適な編集距離を計算
    const optimalDistance = this.getEditDistance(baseVersion, result);
    
    return actualDistance === optimalDistance;
  },
};

/**
 * StringDiffは GenericPatch<string> をベースにした文字列専用の便利API
 * 内部的には文字を配列として扱い、GenericPatchアルゴリズムを使用
 */