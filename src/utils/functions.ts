import * as vscode from "vscode";
import * as path from "node:path";

const commandPrefix = "yamlColorsExt";

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
  const yamlColorsExt = vscode.workspace.getConfiguration(commandPrefix);
  const hexRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

  const defaultBracketColors: vscode.ThemeColor[] = [
    new vscode.ThemeColor("editorBracketHighlight.foreground1"),
    new vscode.ThemeColor("editorBracketHighlight.foreground2"),
    new vscode.ThemeColor("editorBracketHighlight.foreground3"),
  ];

  let colorsArray: vscode.ThemeColor[] | string[] = defaultBracketColors;

  // Handle user-provided data
  if (yamlColorsExt.has("customColors")) {
    const customColors = yamlColorsExt.get("customColors") as string[];

    if (Array.isArray(customColors) && customColors.length > 1) {
      const filterValidColors = customColors.filter((el) => hexRegex.test(el));

      if (filterValidColors.length > 1) {
        colorsArray = filterValidColors;
      }
    }
  }

  return colorsArray.map((color) => {
    return vscode.window.createTextEditorDecorationType({ color });
  });
}

type YamlColorsCommands = {
  commandId: string;
  commandHandler: (args: any) => void;
};

export function registerCommands(context: vscode.ExtensionContext) {
  const commands: YamlColorsCommands[] = [
    {
      commandId: `${commandPrefix}.toggleExtension`,
      commandHandler: () => {
        const yamlColorsExt = vscode.workspace.getConfiguration(commandPrefix);
        const toggleValue = yamlColorsExt.has("enabled") ? !yamlColorsExt.get("enabled") : true;
        yamlColorsExt.update("enabled", toggleValue, true);
      },
    },
  ];

  for (let cmd of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(cmd.commandId, cmd.commandHandler));
  }
}
