import { getColorPalette } from "../utils/functions";
import { DecorationRangesObjects } from "./types/YamlColors";
import * as vscode from "vscode";

export class YamlColors {
  // TODO: These might not be needed
  private readonly keysRegex: RegExp = /^(?:\s*)([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\s|$)/gim;
  private readonly arrayKeysRegex: RegExp = /^(?:\s*)-\s([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\s|$)/gim;
  private customRegex: RegExp;
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
      "(?<=^|\\s)-(?=\\s|$)|(?<=-\\s+)([a-zA-Z0-9_][a-zA-Z0-9_-]*):(?=\\s|$)",
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
  public findAndDoStuff(activeEditor: vscode.TextEditor): void {
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

    /** Used for keeping track how many array are we in to offset the colors */
    let nestedArrayCounter: number = 0;

    let match: RegExpExecArray | null;

    let lastStartOfArrayIntent: number = 0;
    while ((match = this.customRegex.exec(editorText))) {
      // console.log(match);

      const matchText = match[0];
      let colorOrderIndex: number;

      // If the text is "-" we set it to 0 to not exclude it in the selection range
      const excludeColon: number = matchText === "-" ? 0 : 1;

      // Check if we're at a start of an array
      const isStartOfAnArray: boolean = matchText.endsWith("- ");
      const isFirstKeyOfArray: boolean =
        !isStartOfAnArray && nestedArrayCounter > 0 && matchText !== "-" && !matchText.startsWith("\n");

      let startOffset: number = match.index;
      if (isFirstKeyOfArray || match.index === 0) {
        startOffset = match.index;
      } else {
        startOffset = match.index + 1;
      }

      const startPos = activeEditor.document.positionAt(startOffset);
      const endPos = activeEditor.document.positionAt(match.index + match[0].length - excludeColon);

      let newIntentEndPos = matchText.substring(matchText.lastIndexOf("\n")).lastIndexOf(" ");

      if (isFirstKeyOfArray) {
        newIntentEndPos = intentEndPos + 1;
      } else if (newIntentEndPos === -1) {
        newIntentEndPos = 0;
      }

      if (isStartOfAnArray) {
        // Fix the end of an intent by excluding the last two characters
        newIntentEndPos -= 2;

        if (lastStartOfArrayIntent < newIntentEndPos) {
          nestedArrayCounter += 1;
        } else if (lastStartOfArrayIntent > newIntentEndPos) {
          nestedArrayCounter -= 1;
        }

        lastStartOfArrayIntent = newIntentEndPos;
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

    let match;
    while ((match = this.keysRegex.exec(editorText))) {
      const startPos = activeEditor.document.positionAt(match.index);
      const endPos = activeEditor.document.positionAt(match.index + match[0].length - 1);
      const matchText = match[0];
      let intentEndPos = matchText.substring(matchText.lastIndexOf("\n")).lastIndexOf(" ");

      if (intentEndPos === -1) {
        intentEndPos = 0; // root level
      }

      // Calculate the key order and color
      const colorOrderIndex = (intentEndPos / this.tabSize) % this.decorationPalette.length;
      this.decorationRanges[colorOrderIndex].ranges.push(new vscode.Range(startPos, endPos));
    }
  }

  /**
   * Parse the editor text and sort all keys inside arrays like `- key: value`
   * @param activeEditor
   * @returns
   */
  public findAndSortArrayKeys(activeEditor: vscode.TextEditor): void {
    if (!activeEditor) {
      return;
    }

    this.checkAndSetTabSize(activeEditor);
    const editorText: string = activeEditor.document.getText();

    let match;
    while ((match = this.arrayKeysRegex.exec(editorText))) {
      const matchText = match[0];
      // We're adding one to make it a positive number and avoid decimal array index
      let intentEndPos = matchText.indexOf("-") + 1;

      // Range for the '-' part
      const minusStart = match.index + intentEndPos - 1;
      const minusStartPos = activeEditor.document.positionAt(minusStart);
      const minusEndPos = activeEditor.document.positionAt(minusStart + 1);

      // Range for the key
      const keyStartPos = activeEditor.document.positionAt(minusStart + 2);
      const keyEndPos = activeEditor.document.positionAt(match.index + match[0].length - 1);

      // Calculate the key order and color
      let minusColorOrderIndex = ((intentEndPos / this.tabSize) % this.decorationPalette.length) + 1;
      if (minusColorOrderIndex >= this.decorationPalette.length) {
        minusColorOrderIndex = 0;
      }

      let keyColorOrderIndex = minusColorOrderIndex + 1;
      if (keyColorOrderIndex >= this.decorationPalette.length) {
        keyColorOrderIndex = 0;
      }

      // Add ranges to the decorations list
      this.decorationRanges[minusColorOrderIndex].ranges.push(new vscode.Range(minusStartPos, minusEndPos));
      this.decorationRanges[keyColorOrderIndex].ranges.push(new vscode.Range(keyStartPos, keyEndPos));
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
