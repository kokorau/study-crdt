import { type Span, type SpanDto, $Span } from "./Span";

export type PatchDto = Readonly<{
  v: string;
  s: SpanDto[];
}>;

export type Patch = {
  baseVersion: string;
  spans: Span[];
};

export const $Patch = {
  create(patch: Patch): Readonly<Patch> {
    return Object.freeze(patch);
  },
  fromDto(dto: PatchDto): Readonly<Patch> {
    return $Patch.create({
      baseVersion: dto.v,
      spans: dto.s.map($Span.fromDto),
    });
  },
  toDto(patch: Patch): PatchDto {
    return Object.freeze({
      v: patch.baseVersion,
      s: patch.spans.map($Span.toDto),
    });
  },
  apply(patch: Patch): string {
    const { result } = patch.spans.reduce(
      (acc, span) => {
        if ($Span.isRetain(span)) {
          const retained = patch.baseVersion.slice(
            acc.position,
            acc.position + span.count,
          );
          return {
            result: acc.result + retained,
            position: acc.position + span.count,
          };
        }
        if ($Span.isDelete(span)) {
          return {
            result: acc.result,
            position: acc.position + span.count,
          };
        }
        if ($Span.isInsert(span)) {
          return {
            result: acc.result + span.text,
            position: acc.position,
          };
        }
        return acc;
      },
      { result: "", position: 0 },
    );
    return result;
  },
  createFromDiff(before: string, after: string): Patch {
    function createDiffSpans(before: string, after: string): Span[] {
      const spans: Span[] = [];
      
      // Use Longest Common Subsequence (LCS) approach for optimal diff
      const n = before.length;
      const m = after.length;
      
      // Create LCS table
      const lcs: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
      
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (before[i - 1] === after[j - 1]) {
            lcs[i][j] = lcs[i - 1][j - 1] + 1;
          } else {
            lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
          }
        }
      }
      
      // Backtrack to generate operations
      let i = n, j = m;
      const operations: { type: 'retain' | 'delete' | 'insert', count?: number, text?: string }[] = [];
      
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
          // Characters match
          operations.unshift({ type: 'retain', count: 1 });
          i--;
          j--;
        } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
          // Delete from before
          operations.unshift({ type: 'delete', count: 1 });
          i--;
        } else {
          // Insert from after
          operations.unshift({ type: 'insert', text: after[j - 1] });
          j--;
        }
      }
      
      // Merge consecutive operations of the same type
      let k = 0;
      while (k < operations.length) {
        const op = operations[k];
        
        if (op.type === 'retain') {
          let retainCount = op.count || 1;
          while (k + 1 < operations.length && operations[k + 1].type === 'retain') {
            retainCount += operations[k + 1].count || 1;
            k++;
          }
          spans.push($Span.createRetain(retainCount));
        } else if (op.type === 'delete') {
          let deleteCount = op.count || 1;
          while (k + 1 < operations.length && operations[k + 1].type === 'delete') {
            deleteCount += operations[k + 1].count || 1;
            k++;
          }
          spans.push($Span.createDelete(deleteCount));
        } else if (op.type === 'insert') {
          let insertText = op.text || '';
          while (k + 1 < operations.length && operations[k + 1].type === 'insert') {
            insertText += operations[k + 1].text || '';
            k++;
          }
          spans.push($Span.createInsert(insertText));
        }
        k++;
      }
      
      return spans;
    }

    const spans = createDiffSpans(before, after);
    return this.create({
      baseVersion: before,
      spans,
    });
  },
};
