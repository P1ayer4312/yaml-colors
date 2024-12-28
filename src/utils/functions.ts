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
  let toggleCustom = true;

  const defaultBracketColors: vscode.ThemeColor[] = [
    new vscode.ThemeColor("editorBracketHighlight.foreground1"),
    new vscode.ThemeColor("editorBracketHighlight.foreground2"),
    new vscode.ThemeColor("editorBracketHighlight.foreground3"),
  ];

  const customColors: string[] = [
    "#04E762",
    "#F5B700",
    "#00A1E4",
    "#DC0073",
    // 2
  ];

  const chosenArray = toggleCustom ? customColors : defaultBracketColors;

  // TODO: Add option to use colors provided by the user
  return chosenArray.map((color) => {
    return vscode.window.createTextEditorDecorationType({
      color,
      // border: `1px solid ${color}`,
      // border: `1px solid red`,
    });
  });
}
