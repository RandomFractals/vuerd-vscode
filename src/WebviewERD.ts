import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import WebviewManager from "./WebviewManager";
import { Subscription, Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";

const viewType = "vuerd";

export default class WebviewERD {
  private extensionPath: string;
  private disposables: vscode.Disposable[] = [];
  private webviewManager: WebviewManager;
  private value$: Subject<string> = new Subject();
  private subValue: Subscription;

  public panel: vscode.WebviewPanel;
  public uri: vscode.Uri;

  constructor(
    context: vscode.ExtensionContext,
    uri: vscode.Uri,
    webviewManager: WebviewManager,
    webviewPanel?: vscode.WebviewPanel
  ) {
    this.uri = uri;
    this.webviewManager = webviewManager;
    this.extensionPath = context.extensionPath;
    this.subValue = this.value$
      .pipe(debounceTime(300))
      .subscribe((value: string) => {
        fs.writeFile(this.uri.fsPath, value, err => {
          if (err) {
            vscode.window.showErrorMessage(err.message);
          }
        });
      });

    if (webviewPanel) {
      this.panel = webviewPanel;
    } else {
      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;
      this.panel = vscode.window.createWebviewPanel(
        viewType,
        path.basename(uri.fsPath),
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "static"))
          ]
        }
      );
    }

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.setupHtml();
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case "value":
            this.value$.next(message.value);
            return;
          case "getValue":
            try {
              const value = fs.readFileSync(this.uri.fsPath, "utf-8");
              this.panel.webview.postMessage({
                command: "value",
                value
              });
              this.panel.webview.postMessage({
                command: "state",
                uri: this.uri
              });
            } catch (err) {
              vscode.window.showErrorMessage(err.message);
            }
            return;
        }
      },
      null,
      this.disposables
    );
  }

  public dispose() {
    this.webviewManager.remove(this);
    this.panel.dispose();
    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }
    this.subValue.unsubscribe();
  }

  private setupHtml() {
    const pathVue = vscode.Uri.file(
      path.join(this.extensionPath, "static", "vue.min.js")
    );
    const pathVuerd = vscode.Uri.file(
      path.join(this.extensionPath, "static", "vuerd-plugin-erd.umd.min.js")
    );
    const pathUndo = vscode.Uri.file(
      path.join(this.extensionPath, "static", "undomanager.js")
    );
    const pathMain = vscode.Uri.file(
      path.join(this.extensionPath, "static", "main.js")
    );
    const pathCss = vscode.Uri.file(
      path.join(this.extensionPath, "static", "vuerd-plugin-erd.css")
    );

    const uriVue = this.panel.webview.asWebviewUri(pathVue);
    const uriVuerd = this.panel.webview.asWebviewUri(pathVuerd);
    const urlUndo = this.panel.webview.asWebviewUri(pathUndo);
    const urlMain = this.panel.webview.asWebviewUri(pathMain);
    const uriCss = this.panel.webview.asWebviewUri(pathCss);
    const nonce = getNonce();

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${this.panel.webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';"
      >
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>vuerd</title>
      <link rel="stylesheet" type="text/css" nonce="${nonce}" href=${uriCss} />
    </head>
    <body>
      <div id="app"></div>
      <script nonce="${nonce}" src=${uriVue}></script>
      <script nonce="${nonce}" src=${uriVuerd}></script>
      <script nonce="${nonce}" src=${urlUndo}></script>
      <script nonce="${nonce}" src=${urlMain}></script>
    </body>
    </html>
    `;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
