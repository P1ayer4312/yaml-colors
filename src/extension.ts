import * as vscode from "vscode";
import { YamlColors } from "./class/YamlColors";
import { isYamlFileOpened } from "./utils/functions";

export function activate(context: vscode.ExtensionContext) {
  let timeout: NodeJS.Timeout | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;
  const yamlColors: YamlColors = new YamlColors(activeEditor);

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    yamlColors.findAndSortAllKeys(activeEditor);
    yamlColors.applyDecorations(activeEditor);
  }

  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    timeout = setTimeout(updateDecorations, 200);
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && isYamlFileOpened(editor)) {
        activeEditor = editor;
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document && isYamlFileOpened(activeEditor)) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  triggerUpdateDecorations();
}

export function deactivate() {}
