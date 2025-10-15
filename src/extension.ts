import * as vscode from "vscode";
import { YamlColors } from "./class/YamlColors";
import { getExtensionConfig, isYamlFileOpened, registerCommands } from "./utils/functions";

export function activate(context: vscode.ExtensionContext) {
  const configIdentifier = "yamlColorsExt";

  const yamlColorsExt = getExtensionConfig(configIdentifier);
  let isExtensionEnabled: boolean = yamlColorsExt.has("enabled")
    ? (yamlColorsExt.get("enabled") as boolean)
    : true;

  let timeout: NodeJS.Timeout | undefined = undefined;
  let activeEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
  let yamlColors: YamlColors | null = new YamlColors();

  function updateDecorations() {
    if (!activeEditor || !yamlColors) {
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
    const enabledChanged = event.affectsConfiguration(`${configIdentifier}.enabled`);
    const customColorsChanged = event.affectsConfiguration(`${configIdentifier}.customColors`);

    // Handle extension toggle
    if (enabledChanged) {
      const yamlColorsExt = getExtensionConfig(configIdentifier);
      isExtensionEnabled = yamlColorsExt.get("enabled") as boolean;

      if (isExtensionEnabled) {
        activeEditor = vscode.window.activeTextEditor;
        yamlColors = new YamlColors();

        if (activeEditor && isYamlFileOpened(activeEditor)) {
          triggerUpdateDecorations();
        }
      } else if (yamlColors) {
        yamlColors.clearDecorationRanges();
        yamlColors = null;
      }
    }

    // Handle colors array change
    if (isExtensionEnabled && customColorsChanged && yamlColors) {
      yamlColors.redefineDecorationPalette();
    }
  }, null, context.subscriptions);

  registerCommands(context);

  if (isExtensionEnabled && activeEditor && isYamlFileOpened(activeEditor)) {
    triggerUpdateDecorations();
  }
}

export function deactivate() {}
