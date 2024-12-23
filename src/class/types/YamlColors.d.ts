import { TextEditorDecorationType, Range } from "vscode";

export type DecorationRanges = {
  decoration: TextEditorDecorationType;
  ranges: Range[];
};

export type DecorationRangesObjects = {
  [key: number]: DecorationRanges;
};
