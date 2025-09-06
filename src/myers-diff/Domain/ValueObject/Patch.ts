import { Span, SpanDto, $Span } from './Span';

export type PatchDto = {
  v: string;
  s: SpanDto[];
};

export type Patch = {
  baseVersion: string;
  spans: Span[];
};

export const $Patch = {
  create(patch: Patch): Readonly<Patch> {
    return Object.freeze(patch);
  },
  fromDto(dto: PatchDto): Patch {
    return {
      baseVersion: dto.v,
      spans: dto.s.map($Span.fromDto),
    };
  },
  toDto(patch: Patch): PatchDto {
    return {
      v: patch.baseVersion,
      s: patch.spans.map($Span.toDto),
    };
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
};
