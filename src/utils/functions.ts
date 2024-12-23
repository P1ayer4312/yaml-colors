import * as vscode from "vscode";
import * as path from "node:path";

/**
 * Check if the opened active document is a YAML file
 * @param activeTextEditor
 * @returns
 */
export function isYamlFileOpened(activeTextEditor: vscode.TextEditor): boolean {
  if (!activeTextEditor) {
    return false;
  }

  const fileName: string | undefined = activeTextEditor.document.fileName;
  const languageId = activeTextEditor.document.languageId;

  if (languageId === "yaml" || (fileName && [".yaml", ".yml"].includes(path.extname(fileName)))) {
    return true;
  }

  return false;
}

export function getColorPalette(): vscode.TextEditorDecorationType[] {
  const defaultBracketColors: vscode.ThemeColor[] = [
    new vscode.ThemeColor("editorBracketHighlight.foreground1"),
    new vscode.ThemeColor("editorBracketHighlight.foreground2"),
    new vscode.ThemeColor("editorBracketHighlight.foreground3"),
  ];

  // TODO: Add option to use colors provided by the user
  return defaultBracketColors.map((color) => {
    return vscode.window.createTextEditorDecorationType({
      color,
      // border: "1px solid red",
    });
  });
}
