export interface GridInfo {
  width: number;
  height: number;
  before: string[];
  after: string[];
}

export interface GridCell {
  x: number;
  y: number;
  isOnPath: boolean;
  operation: string;
  beforeChar: string | null;
  afterChar: string | null;
}

export interface EditStep {
  x: number;
  y: number;
  operation: "match" | "delete" | "insert" | "start";
  char?: string;
  displayText?: string;
}

export interface PathSegment {
  from: EditStep;
  to: EditStep;
  operation: string;
}