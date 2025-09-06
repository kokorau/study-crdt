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
    function createOptimalDiff(before: string, after: string): Span[] {
      // Use optimized LCS-based approach that produces minimal edit distance
      const n = before.length;
      const m = after.length;

      // Special cases
      if (n === 0) return after ? [$Span.createInsert(after)] : [];
      if (m === 0) return [$Span.createDelete(n)];
      if (before === after) return [$Span.createRetain(n)];

      // Build LCS table
      const lcs: number[][] = Array(n + 1)
        .fill(0)
        .map(() => Array(m + 1).fill(0));

      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (before[i - 1] === after[j - 1]) {
            lcs[i][j] = lcs[i - 1][j - 1] + 1;
          } else {
            lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
          }
        }
      }

      // Backtrack to generate optimal edit sequence
      const operations: {
        op: "retain" | "delete" | "insert";
        value?: string;
      }[] = [];
      let i = n,
        j = m;

      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
          operations.unshift({ op: "retain" });
          i--;
          j--;
        } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
          operations.unshift({ op: "delete" });
          i--;
        } else if (j > 0) {
          operations.unshift({ op: "insert", value: after[j - 1] });
          j--;
        }
      }

      // Merge consecutive operations
      const spans: Span[] = [];
      let k = 0;

      while (k < operations.length) {
        const op = operations[k];

        if (op.op === "retain") {
          let count = 1;
          while (
            k + 1 < operations.length &&
            operations[k + 1].op === "retain"
          ) {
            count++;
            k++;
          }
          spans.push($Span.createRetain(count));
        } else if (op.op === "delete") {
          let count = 1;
          while (
            k + 1 < operations.length &&
            operations[k + 1].op === "delete"
          ) {
            count++;
            k++;
          }
          spans.push($Span.createDelete(count));
        } else if (op.op === "insert") {
          let text = op.value || "";
          while (
            k + 1 < operations.length &&
            operations[k + 1].op === "insert"
          ) {
            k++;
            text += operations[k].value || "";
          }
          spans.push($Span.createInsert(text));
        }
        k++;
      }

      return spans;
    }

    const spans = createOptimalDiff(before, after);
    return this.create({
      baseVersion: before,
      spans,
    });
  },
  isOptimalPath(patch: Patch): boolean {
    const originalResult = this.apply(patch);

    // Calculate actual edit distance from the patch
    const actualDistance = patch.spans.reduce((acc, span) => {
      if ($Span.isDelete(span)) return acc + span.count;
      if ($Span.isInsert(span)) return acc + span.text.length;
      return acc;
    }, 0);

    // Calculate theoretical minimum using Myers algorithm
    const optimalPatch = this.createFromDiff(patch.baseVersion, originalResult);
    const theoreticalDistance = optimalPatch.spans.reduce((acc, span) => {
      if ($Span.isDelete(span)) return acc + span.count;
      if ($Span.isInsert(span)) return acc + span.text.length;
      return acc;
    }, 0);

    return actualDistance === theoreticalDistance;
  },
  getEditDistance(before: string, after: string): number {
    const patch = this.createFromDiff(before, after);
    return patch.spans.reduce((acc, span) => {
      if ($Span.isDelete(span)) return acc + span.count;
      if ($Span.isInsert(span)) return acc + span.text.length;
      return acc;
    }, 0);
  },
};
