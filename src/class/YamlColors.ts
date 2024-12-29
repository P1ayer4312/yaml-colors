import { getColorPalette } from "../utils/functions";
import { DecorationRangesObjects } from "./types/YamlColors";
import * as vscode from "vscode";

export class YamlColors {
  private readonly customRegex: RegExp;
  private readonly decorationPalette: vscode.TextEditorDecorationType[];
  private decorationRanges: DecorationRangesObjects = {};
  private tabSize: number = 0;

  constructor(activeEditor?: vscode.TextEditor) {
    this.decorationPalette = getColorPalette();
    const regexBuilder = [
      // Capture normal keys
      "^(?:\\s*)([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\\s|$)",
      // Capture start minus of an array
      "^(?:\\s*)-\\s",
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

    /**
     * Store the key intent to check if we're still inside an array,
     * also used when determining which color to use
     */
    let intentEndPos: number = 0;

    let match: RegExpExecArray | null;
    while ((match = this.customRegex.exec(editorText))) {
      // console.log(match);

      const matchText = match[0];
      let colorOrderIndex: number;

      // Check if we're at a start of an array
      const isStartOfAnArray: boolean = matchText.endsWith("- ");
      const isFirstKeyOfArray: boolean =
        !isStartOfAnArray && matchText !== "-" && !matchText.startsWith("\n");

      let startOffset: number;
      if (isFirstKeyOfArray || match.index === 0) {
        startOffset = match.index;
      } else {
        startOffset = match.index + 1;
      }

      const startPos = activeEditor.document.positionAt(startOffset);
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

      this.decorationRanges[colorOrderIndex].ranges.push(new vscode.Range(startPos, endPos));
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

  public printRanges() {
    console.log(this.decorationRanges);
  }
}
