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
      let beforePos = 0;
      let afterPos = 0;

      // Simple approach: analyze character by character
      while (beforePos < before.length || afterPos < after.length) {
        if (beforePos >= before.length) {
          // Only insertions left
          spans.push($Span.createInsert(after.slice(afterPos)));
          break;
        } else if (afterPos >= after.length) {
          // Only deletions left
          spans.push($Span.createDelete(before.length - beforePos));
          break;
        } else if (before[beforePos] === after[afterPos]) {
          // Characters match - retain
          let retainCount = 1;
          while (
            beforePos + retainCount < before.length &&
            afterPos + retainCount < after.length &&
            before[beforePos + retainCount] === after[afterPos + retainCount]
          ) {
            retainCount++;
          }
          spans.push($Span.createRetain(retainCount));
          beforePos += retainCount;
          afterPos += retainCount;
        } else {
          // Characters don't match - find optimal operation
          let deleteCount = 0;
          let insertText = "";

          // Look ahead to find next matching position
          let found = false;

          // Simple heuristic: look for next matching character within reasonable distance
          for (
            let lookAhead = 1;
            lookAhead <=
            Math.min(
              10,
              Math.max(before.length - beforePos, after.length - afterPos),
            );
            lookAhead++
          ) {
            // Try deletion
            if (
              beforePos + lookAhead < before.length &&
              afterPos < after.length &&
              before[beforePos + lookAhead] === after[afterPos]
            ) {
              deleteCount = lookAhead;
              found = true;
              break;
            }
            // Try insertion
            if (
              beforePos < before.length &&
              afterPos + lookAhead < after.length &&
              before[beforePos] === after[afterPos + lookAhead]
            ) {
              insertText = after.slice(afterPos, afterPos + lookAhead);
              found = true;
              break;
            }
          }

          if (!found) {
            // No nearby match found - replace one character
            spans.push($Span.createDelete(1));
            spans.push($Span.createInsert(after[afterPos]));
            beforePos++;
            afterPos++;
          } else if (deleteCount > 0) {
            spans.push($Span.createDelete(deleteCount));
            beforePos += deleteCount;
          } else if (insertText.length > 0) {
            spans.push($Span.createInsert(insertText));
            afterPos += insertText.length;
          }
        }
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
