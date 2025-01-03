import { getColorPalette } from "../utils/functions";
import { DecorationRangesObjects } from "./types/YamlColors";
import * as vscode from "vscode";

export class YamlColors {
  private readonly customRegex: RegExp;
  private decorationPalette: vscode.TextEditorDecorationType[];
  private decorationRanges: DecorationRangesObjects = {};
  private tabSize: number = 0;

  constructor(activeEditor?: vscode.TextEditor) {
    this.decorationPalette = getColorPalette();
    const regexBuilder = [
      // Capture normal keys
      "^(?:\\s*)([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\\s|$)",
      // Capture start minus of an array
      "^(?:\\s*)-\\s",
      // Capture all commented yaml parts and exclude them, tried to do it in regex didn't work
      "^(\\s*)#",
      // Capture each array minus and the following key
      "(?<=^|\\s)-(?=\\s|$)|(?<=-\\s)([a-zA-Z0-9_][a-zA-Z0-9_-]*):(?=\\s|$)",
    ];

    this.customRegex = new RegExp(regexBuilder.join("|"), "gim");

    // Define all decoration ranges
    for (let [key, value] of this.decorationPalette.entries()) {
      this.decorationRanges[key] = { ranges: [], decoration: value };
    }

    if (activeEditor) {
      this.checkAndSetTabSize(activeEditor);
    }
  }

  /**
   * Set the tab size
   * @param activeEditor
   * @returns
   */
  private checkAndSetTabSize(activeEditor: vscode.TextEditor): void {
    const size = Number(activeEditor.options.tabSize);

    if (activeEditor && !isNaN(size)) {
      this.tabSize = size;
    }
  }

  /**
   * Parse the editor text and sort each key with appropriate color
   * @param activeEditor
   * @returns
   */
  public findAndSortAllKeys(activeEditor: vscode.TextEditor): void {
    if (!activeEditor) {
      return;
    }

    this.checkAndSetTabSize(activeEditor);
    const editorText: string = activeEditor.document.getText();

    /** Store the key intent to determine which color to use */
    let intentEndPos: number = 0;

    /** Skip line operations if it's a comment or processed, the regex captures commented parts too */
    let processedLine: number = -1;

    let match: RegExpExecArray | null;
    while ((match = this.customRegex.exec(editorText))) {
      let colorOrderIndex: number;
      let startOffset: number;
      const matchText = match[0];

      // Check if we're at a start of an array
      const isStartOfAnArray: boolean = matchText.endsWith("- ");

      // Check if it's the first intent array minus
      const isFirstKeyOfArray: boolean =
        !isStartOfAnArray && matchText !== "-" && !matchText.startsWith("\n");

      if (isFirstKeyOfArray || match.index === 0) {
        startOffset = match.index;
      } else {
        startOffset = match.index + 1;
      }

      let lastNewLineIndex = match[0].lastIndexOf("\n");
      if (lastNewLineIndex === -1) {
        lastNewLineIndex = 0;
      }

      const startPos = activeEditor.document.positionAt(startOffset + lastNewLineIndex);

      if (processedLine === startPos.line || matchText.endsWith("#")) {
        // Skip line if it's a comment or marked as processed
        processedLine = startPos.line;
        continue;
      }

      const endPos = activeEditor.document.positionAt(match.index + match[0].length - 1);

      let newIntentEndPos = matchText.substring(matchText.lastIndexOf("\n")).lastIndexOf(" ");

      if (match.index === 0) {
        // Fix the color index for the first line key
        newIntentEndPos = 0;
      } else if (isFirstKeyOfArray) {
        // Adjust the color for the first key of an array to follow order
        newIntentEndPos = intentEndPos + 1;
      } else if (matchText === "-") {
        newIntentEndPos = intentEndPos + 2;
      } else if (newIntentEndPos === -1) {
        // The key has no intent
        newIntentEndPos = 0;
      }

      if (isStartOfAnArray) {
        // Fix the end of an intent by excluding the last two characters
        newIntentEndPos -= 2;
      }

      intentEndPos = newIntentEndPos;

      colorOrderIndex = Math.round(intentEndPos / this.tabSize) % this.decorationPalette.length;
      if (colorOrderIndex < 0) {
        colorOrderIndex = 0;
      }

      // Add selected range to the collection
      this.decorationRanges[colorOrderIndex].ranges.push(new vscode.Range(startPos, endPos));

      if (matchText.endsWith(":")) {
        // Mark line as processed to not capture comments after the key. We do this at the
        // bottom to first add the key and then exclude the line
        processedLine = startPos.line;
      }
    }
  }

  /**
   * Apply all decorations and clear old ones
   * @param activeEditor
   * @returns
   */
  public applyDecorations(activeEditor: vscode.TextEditor): void {
    if (!activeEditor) {
      return;
    }

    for (let key in this.decorationRanges) {
      const item = this.decorationRanges[key];
      activeEditor.setDecorations(item.decoration, item.ranges);

      // Clear old ranges
      item.ranges.length = 0;
    }
  }

  /** Fetch the new color palette and restructure old ranges */
  public redefineDecorationPalette() {
    this.decorationRanges = {};
    this.decorationPalette = getColorPalette();
    for (let [key, value] of this.decorationPalette.entries()) {
      this.decorationRanges[key] = { ranges: [], decoration: value };
    }
  }

  /** Dispose old decorations before destroying the object */
  public clearDecorationRanges() {
    for (let key in this.decorationRanges) {
      const item = this.decorationRanges[key];
      item.decoration.dispose();
      item.ranges.length = 0;
    }
    this.decorationRanges = {};
  }
}
