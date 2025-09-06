import { computed, type Ref } from "vue";
import type { Patch } from "../myers-diff";
import type { GridInfo, GridCell, EditStep, PathSegment } from "../types/diff";

export function useDiffVisualization(patch: Ref<Patch>) {
  // Apply patch to get the result string
  function applyPatch(): string {
    let result = "";
    let position = 0;

    for (const span of patch.value.spans) {
      if (span.type === "retain") {
        result += patch.value.baseVersion.slice(position, position + span.count);
        position += span.count;
      } else if (span.type === "delete") {
        position += span.count;
      } else if (span.type === "insert") {
        result += span.text;
      }
    }

    return result;
  }

  // Grid dimensions based on patch
  const gridInfo = computed<GridInfo>(() => {
    const before = patch.value.baseVersion;
    const after = applyPatch();
    return {
      width: before.length,
      height: after.length,
      before: before.split(""),
      after: after.split(""),
    };
  });

  // Get intermediate results for each step
  const intermediateResults = computed(() => {
    const results: string[] = [];
    let result = "";
    let position = 0;

    // Initial state
    results.push("");

    for (const span of patch.value.spans) {
      if (span.type === "retain") {
        result += patch.value.baseVersion.slice(position, position + span.count);
        position += span.count;
      } else if (span.type === "delete") {
        // Don't add deleted content to result, just move position
        position += span.count;
      } else if (span.type === "insert") {
        result += span.text;
      }
      results.push(result);
    }

    return results;
  });

  // Get the text content for each operation (only the diff part)
  function getOperationDiff(span: any, index: number): string {
    if (span.type === "insert") {
      return span.text;
    } else if (span.type === "delete" || span.type === "retain") {
      let position = 0;

      // Calculate position up to current span
      for (let i = 0; i < index; i++) {
        const prevSpan = patch.value.spans[i];
        if (prevSpan.type === "retain" || prevSpan.type === "delete") {
          position += prevSpan.count;
        }
      }

      return patch.value.baseVersion.slice(position, position + span.count);
    }

    return "";
  }

  // Calculate the edit path for visualization
  const editPath = computed<EditStep[]>(() => {
    const before = patch.value.baseVersion;
    const after = applyPatch();
    const path: EditStep[] = [];
    let x = 0;
    let y = 0;

    path.push({ x: 0, y: 0, operation: "start", displayText: "•" });

    for (const span of patch.value.spans) {
      if (span.type === "retain") {
        for (let i = 0; i < span.count; i++) {
          const char = before[x];
          x++;
          y++;
          path.push({
            x,
            y,
            operation: "match",
            char,
            displayText: char || "•",
          });
        }
      } else if (span.type === "delete") {
        for (let i = 0; i < span.count; i++) {
          const char = before[x];
          x++;
          path.push({
            x,
            y,
            operation: "delete",
            char,
            displayText: `-${char}`,
          });
        }
      } else if (span.type === "insert") {
        for (const char of span.text) {
          y++;
          path.push({
            x,
            y,
            operation: "insert",
            char,
            displayText: `+${char}`,
          });
        }
      }
    }

    return path;
  });

  // Generate grid cells for visualization
  const gridCells = computed<GridCell[]>(() => {
    const cells: GridCell[] = [];
    const { width, height, before, after } = gridInfo.value;

    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        const isOnPath = editPath.value.some((p) => p.x === x && p.y === y);
        const pathPoint = editPath.value.find((p) => p.x === x && p.y === y);

        cells.push({
          x,
          y,
          isOnPath,
          operation: pathPoint?.operation || "none",
          beforeChar: x > 0 ? before[x - 1] : null,
          afterChar: y > 0 ? after[y - 1] : null,
        });
      }
    }

    return cells;
  });

  // Generate path segments for line drawing
  const pathSegments = computed<PathSegment[]>(() => {
    const segments: PathSegment[] = [];
    const path = editPath.value;

    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];

      segments.push({
        from,
        to,
        operation: to.operation,
      });
    }

    return segments;
  });

  return {
    gridInfo,
    intermediateResults,
    editPath,
    gridCells,
    pathSegments,
    getOperationDiff,
    applyPatch,
  };
}