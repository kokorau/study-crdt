import type { EqualityComparer } from "./Comparer";

/**
 * Span操作の定義
 */
export type SpanDto<T> = 
  | { r: number }           // retain
  | { d: number }           // delete  
  | { i: T[] };             // insert

type SpanRetain = { type: "retain"; count: number };
type SpanDelete = { type: "delete"; count: number };
type SpanInsert<T> = { type: "insert"; items: T[] };

export type Span<T> = SpanRetain | SpanDelete | SpanInsert<T>;

export const $Span = {
  createRetain(count: number): Readonly<SpanRetain> {
    return Object.freeze({ type: "retain", count });
  },

  createDelete(count: number): Readonly<SpanDelete> {
    return Object.freeze({ type: "delete", count });
  },

  createInsert<T>(items: T[]): Readonly<SpanInsert<T>> {
    return Object.freeze({ type: "insert", items: [...items] });
  },

  isRetain<T>(span: Span<T>): span is SpanRetain {
    return span.type === "retain";
  },

  isDelete<T>(span: Span<T>): span is SpanDelete {
    return span.type === "delete";
  },

  isInsert<T>(span: Span<T>): span is SpanInsert<T> {
    return span.type === "insert";
  },

  fromDto<T>(dto: SpanDto<T>): Readonly<Span<T>> {
    if ("r" in dto) return $Span.createRetain(dto.r);
    if ("d" in dto) return $Span.createDelete(dto.d);
    if ("i" in dto) return $Span.createInsert(dto.i);
    throw new Error("Invalid span DTO");
  },

  toDto<T>(span: Span<T>): SpanDto<T> {
    switch (span.type) {
      case "retain":
        return { r: span.count };
      case "delete":
        return { d: span.count };
      case "insert":
        return { i: [...span.items] };
    }
  },
};

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
};

export const $Patch = {
  create<T>(patch: Patch<T>): Readonly<Patch<T>> {
    return Object.freeze({
      baseVersion: [...patch.baseVersion],
      spans: [...patch.spans],
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
   * Patchを配列に適用
   */
  apply<T>(patch: Patch<T>): T[] {
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

  /**
   * 2つの配列の差分からPatchを生成
   */
  createFromDiff<T>(
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
    return this.create({
      baseVersion: [...before],
      spans,
    });
  },

  /**
   * 編集距離を計算
   */
  getEditDistance<T>(before: T[], after: T[], comparer: EqualityComparer<T>): number {
    const patch = this.createFromDiff(before, after, comparer);
    return patch.spans.reduce((acc, span) => {
      if ($Span.isDelete(span)) return acc + span.count;
      if ($Span.isInsert(span)) return acc + span.items.length;
      return acc;
    }, 0);
  },
};