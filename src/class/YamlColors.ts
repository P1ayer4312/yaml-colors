import { getColorPalette } from "../utils/functions";
import { DecorationRangesObjects } from "./types/YamlColors";
import * as vscode from "vscode";
import * as yaml from "yaml";

export class YamlColors {
  private decorationPalette: vscode.TextEditorDecorationType[];
  private decorationRanges: DecorationRangesObjects = {};

  constructor() {
    this.decorationPalette = getColorPalette();

    // Define all decoration ranges
    for (let [key, value] of this.decorationPalette.entries()) {
      this.decorationRanges[key] = { ranges: [], decoration: value };
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

    const editorText: string = activeEditor.document.getText();
    const rangesCollector: vscode.Range[] = [];
    const docs = yaml.parseAllDocuments(editorText, { keepSourceTokens: true });
    const tabSize = Number(activeEditor.options.tabSize) || 2;

    // Convert yaml ranges to active editor positions and create a Range object
    function createRange(input: number[]): vscode.Range {
      const startPos = activeEditor.document.positionAt(input[0]);
      const endPos = activeEditor.document.positionAt(input[1]);

      return new vscode.Range(startPos, endPos);
    }

    // Used for getting the positions of array dashes '-'
    function extractSrcTokenRanges(input: yaml.CST.Token) {
      if (input.type === "block-map") {
        for (let item of input.items) {
          if (item.value) {
            extractSrcTokenRanges(item.value);
          }
        }
      } else if (input.type === "block-seq") {
        input.items.forEach((item) => {
          const start = item.start.find((item) => item.source === "-");
          if (start) {
            rangesCollector.push(createRange([start.offset, start.offset + 1, -1]));
          }
        });
      }
    }

    // Iterate over all yaml parts and extract their ranges
    function extractRanges(input: any) {
      if (input instanceof yaml.YAMLMap && !input.flow) {
        for (let item of input.items) {
          rangesCollector.push(createRange(item.key.range));

          if (!(item.value instanceof yaml.Scalar)) {
            extractRanges(item.value);
          }
        }
      } else if (input instanceof yaml.YAMLSeq && !input.flow) {
        if (input.srcToken) {
          extractSrcTokenRanges(input.srcToken);
        }

        for (let item of input.items) {
          if (!(item instanceof yaml.Scalar)) {
            extractRanges(item);
          }
        }
      }
    }

    for (let doc of docs) {
      extractRanges(doc.contents);
    }

    rangesCollector.forEach((item) => {
      let keyOffset = item.start.character;
      const offsetMod = keyOffset % tabSize;
      if (offsetMod !== 0) {
        // Not sure if this is a proper way to handle tab size 4 for dashes '-'
        keyOffset -= offsetMod + tabSize;
      }
      const colorOrderIndex = Math.round(keyOffset / tabSize) % this.decorationPalette.length;
      this.decorationRanges[colorOrderIndex].ranges.push(item);
    });
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
