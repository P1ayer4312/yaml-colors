import { getColorPalette } from "../utils/functions";
import { DecorationRangesObjects } from "./types/YamlColors";
import * as vscode from "vscode";

export class YamlColors {
  private readonly keysRegex: RegExp = /^(?:\s*)([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\s|$)/gim;
  private readonly arrayKeysRegex: RegExp = /^(?:\s*)-\s([a-zA-Z0-9_][a-zA-Z0-9_:-]*):(?=\s|$)/gim;
  private readonly decorationPalette: vscode.TextEditorDecorationType[];
  private decorationRanges: DecorationRangesObjects = {};
  private tabSize: number = 0;

  constructor(activeEditor?: vscode.TextEditor) {
    this.decorationPalette = getColorPalette();

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
