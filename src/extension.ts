import * as vscode from "vscode";
import { YamlColors } from "./class/YamlColors";
import { isYamlFileOpened, registerCommands } from "./utils/functions";

export function activate(context: vscode.ExtensionContext) {
  const yamlColorsExt = vscode.workspace.getConfiguration("yamlColorsExt");
  let isExtensionEnabled: boolean = yamlColorsExt.has("enabled")
    ? Boolean(yamlColorsExt.get("enabled"))
    : true;

  let timeout: NodeJS.Timeout | undefined = undefined;
  let activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  let yamlColors: YamlColors | null = new YamlColors(activeEditor);

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    yamlColors!.findAndSortAllKeys(activeEditor);
    yamlColors!.applyDecorations(activeEditor);
  }

  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    timeout = setTimeout(updateDecorations, 100);
  }

  // prettier-ignore
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (isExtensionEnabled && editor && isYamlFileOpened(editor)) {
      activeEditor = editor;
      triggerUpdateDecorations();
    }
  }, null, context.subscriptions);

  // prettier-ignore
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (
      isExtensionEnabled && activeEditor &&
      event.document === activeEditor.document && isYamlFileOpened(activeEditor)
    ) {
      triggerUpdateDecorations();
    }
  }, null, context.subscriptions);

  // prettier-ignore
  vscode.workspace.onDidOpenTextDocument((event) => {
    // Trigger when a new unsaved file is added and the language mode changes
    if (isExtensionEnabled && event.languageId === "yaml") {
      activeEditor = vscode.window.activeTextEditor;
      triggerUpdateDecorations();
    }
  }, null, context.subscriptions);

  // prettier-ignore
  vscode.workspace.onDidChangeConfiguration((event) => {
    const enabledChanged = event.affectsConfiguration("yamlColorsExt.enabled");
    const customColorsChanged = event.affectsConfiguration("yamlColorsExt.customColors");

    // Handle extension toggle
    if (enabledChanged) {
      const yamlColorsExt = vscode.workspace.getConfiguration("yamlColorsExt");
      isExtensionEnabled = Boolean(yamlColorsExt.get("enabled"));

      if (isExtensionEnabled) {
        activeEditor = vscode.window.activeTextEditor;
        yamlColors = new YamlColors(activeEditor);

        if (activeEditor && isYamlFileOpened(activeEditor)) {
          triggerUpdateDecorations();
        }
      } else {
        yamlColors!.clearDecorationRanges();
        yamlColors = null;
      }
    }

    // Handle colors array change
    if (customColorsChanged && isExtensionEnabled) {
      yamlColors!.redefineDecorationPalette();
    }
  }, null, context.subscriptions);

  registerCommands(context);

  if (isExtensionEnabled) {
    triggerUpdateDecorations();
  }
}

export function deactivate() {}
