import * as vscode from "vscode";
import WebviewERD from "./WebviewERD";

class WebviewManager {
  private erdList: WebviewERD[];

  constructor() {
    this.erdList = [];
  }

  public add(context: vscode.ExtensionContext, uri: vscode.Uri): WebviewERD {
    let erd = this.find(uri);
    if (erd === null) {
      erd = new WebviewERD(context, uri, this);
      this.erdList.push(erd);
    } else {
      erd.panel.reveal();
    }
    return erd;
  }

  public revive(
    context: vscode.ExtensionContext,
    uri: vscode.Uri,
    webviewPanel: vscode.WebviewPanel
  ) {
    this.erdList.push(new WebviewERD(context, uri, this, webviewPanel));
  }

  public remove(erd: WebviewERD) {
    const index = this.erdList.indexOf(erd);
    if (index >= 0) {
      this.erdList.splice(index, 1);
    }
  }

  public find(uri: vscode.Uri): WebviewERD | null {
    let target: WebviewERD | null = null;
    for (const erd of this.erdList) {
      if (erd.uri.fsPath === uri.fsPath) {
        target = erd;
        break;
      }
    }
    return target;
  }
}

export const webviewManager = new WebviewManager();
export default WebviewManager;
