import { type EqualityComparer, Comparers } from "./Comparer";
import { type Span, type SpanDto, $Span } from "./Span";

/**
 * Patch定義
 */
export type PatchDto<T> = Readonly<{
  v: T[];
  s: SpanDto<T>[];
}>;

export type Patch<T> = {
  baseVersion: T[];
  spans: Span<T>[];
  _isStringPatch?: boolean; // 内部メタデータ
};

export const $Patch = {
  create<T>(patch: Patch<T>): Readonly<Patch<T>> {
    return Object.freeze({
      baseVersion: [...patch.baseVersion],
      spans: [...patch.spans],
      _isStringPatch: patch._isStringPatch,
    });
  },

  fromDto<T>(dto: PatchDto<T>): Readonly<Patch<T>> {
    return $Patch.create({
      baseVersion: [...dto.v],
      spans: dto.s.map($Span.fromDto),
    });
  },

  toDto<T>(patch: Patch<T>): PatchDto<T> {
    return Object.freeze({
      v: [...patch.baseVersion],
      s: patch.spans.map($Span.toDto),
    });
  },

  /**
   * 配列版の差分作成（内部実装）
   */
  _createFromDiffArray<T>(
    before: T[], 
    after: T[], 
    comparer: EqualityComparer<T>
  ): Patch<T> {
    function createOptimalDiff(before: T[], after: T[]): Span<T>[] {
      const n = before.length;
      const m = after.length;

      // Special cases
      if (n === 0) return after.length ? [$Span.createInsert(after)] : [];
      if (m === 0) return [$Span.createDelete(n)];
      
      // 全要素が同じかチェック
      if (n === m && before.every((item, i) => comparer.equals(item, after[i]))) {
        return [$Span.createRetain(n)];
      }

      // Build LCS table
      const lcs: number[][] = Array(n + 1)
        .fill(0)
        .map(() => Array(m + 1).fill(0));

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (comparer.equals(before[i - 1], after[j - 1])) {
            lcs[i][j] = lcs[i - 1][j - 1] + 1;
          } else {
            lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
          }
        }
      }

      // Backtrack to generate optimal edit sequence
      const operations: {
        op: "retain" | "delete" | "insert";
        item?: T;
      }[] = [];
      let i = n, j = m;

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && comparer.equals(before[i - 1], after[j - 1])) {
          operations.unshift({ op: "retain" });
          i--;
          j--;
        } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
          operations.unshift({ op: "delete" });
          i--;
        } else if (j > 0) {
          operations.unshift({ op: "insert", item: after[j - 1] });
          j--;
        }
      }

      // Merge consecutive operations
      const spans: Span<T>[] = [];
      let k = 0;

      while (k < operations.length) {
        const op = operations[k];

        if (op.op === "retain") {
          let count = 1;
          while (k + 1 < operations.length && operations[k + 1].op === "retain") {
            count++;
            k++;
          }
          spans.push($Span.createRetain(count));
        } else if (op.op === "delete") {
          let count = 1;
          while (k + 1 < operations.length && operations[k + 1].op === "delete") {
            count++;
            k++;
          }
          spans.push($Span.createDelete(count));
        } else if (op.op === "insert") {
          const items: T[] = [op.item!];
          while (k + 1 < operations.length && operations[k + 1].op === "insert") {
            k++;
            items.push(operations[k].item!);
          }
          spans.push($Span.createInsert(items));
        }
        k++;
      }

      return spans;
    }

    const spans = createOptimalDiff(before, after);
    return Object.freeze({
      baseVersion: [...before],
      spans,
    });
  },

  /**
   * パッチを配列に適用（内部実装）
   */
  _applyArray<T>(patch: Patch<T>): T[] {
    const result: T[] = [];
    let position = 0;

    for (const span of patch.spans) {
      if ($Span.isRetain(span)) {
        const retained = patch.baseVersion.slice(position, position + span.count);
        result.push(...retained);
        position += span.count;
      } else if ($Span.isDelete(span)) {
        position += span.count;
      } else if ($Span.isInsert(span)) {
        result.push(...span.items);
      }
    }

    return result;
  },

  // ===== 統一API =====
  
  /**
   * 差分を作成（文字列または配列）
   */
  createFromDiff<T>(
    before: T[] | string, 
    after: T[] | string, 
    comparer?: EqualityComparer<T>
  ): Patch<T> | Patch<string> {
    if (typeof before === "string" && typeof after === "string") {
      // 文字列版の処理
      const beforeArray = before.split("");
      const afterArray = after.split("");
      const stringComparer = Comparers.strict<string>();
      const patch = this._createFromDiffArray(beforeArray, afterArray, stringComparer);
      // 文字列Patchであることをマークした新しいオブジェクトを作成
      return Object.freeze({
        ...patch,
        _isStringPatch: true,
      }) as Patch<string>;
    } else {
      // 配列版の処理
      if (!comparer) throw new Error("Comparer is required for array diff");
      return this._createFromDiffArray(before as T[], after as T[], comparer);
    }
  },

  /**
   * パッチを適用（文字列または配列）
   */
  apply<T>(patch: Patch<T> | Patch<string>): T[] | string {
    const resultArray = this._applyArray(patch as Patch<T>);
    
    // 文字列Patchの場合は文字列に変換
    if ((patch as any)._isStringPatch) {
      return (resultArray as string[]).join("");
    }
    
    return resultArray;
  },

  /**
   * 編集距離を計算（文字列または配列）
   */
  getEditDistance<T>(
    before: T[] | string, 
    after: T[] | string, 
    comparer?: EqualityComparer<T>
  ): number {
    let patch: Patch<any>;
    
    if (typeof before === "string" && typeof after === "string") {
      patch = this.createFromDiff(before, after);
    } else {
      if (!comparer) throw new Error("Comparer is required for array edit distance");
      patch = this.createFromDiff(before as T[], after as T[], comparer);
    }
    
    return patch.spans.reduce((acc, span) => {
      if ($Span.isDelete(span)) return acc + span.count;
      if ($Span.isInsert(span)) return acc + span.items.length;
      return acc;
    }, 0);
  },
};