"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const vscode = require("vscode");
const viewType = "vuerd";
class WebviewERD {
    constructor(context, uri, webviewManager) {
        this.disposables = [];
        this.uri = uri;
        this.webviewManager = webviewManager;
        this.extensionPath = context.extensionPath;
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        this.panel = vscode.window.createWebviewPanel(viewType, path.basename(uri.fsPath), column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, "static"))
            ]
        });
        this.panel.webview.html = this.setupHtml();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case "value":
                    fs.writeFile(this.uri.fsPath, message.value, err => {
                        if (err) {
                            vscode.window.showErrorMessage(err.message);
                        }
                    });
                    break;
                case "getValue":
                    try {
                        const value = fs.readFileSync(this.uri.fsPath, "utf-8");
                        this.panel.webview.postMessage({
                            command: "value",
                            value
                        });
                    }
                    catch (err) {
                        vscode.window.showErrorMessage(err.message);
                    }
                    break;
            }
        }, null, this.disposables);
    }
    dispose() {
        this.panel.webview.postMessage({
            command: "destroyed"
        });
        this.webviewManager.remove(this);
        this.panel.dispose();
    }
    setupHtml() {
        const pathVue = vscode.Uri.file(path.join(this.extensionPath, "static", "vue.min.js"));
        const pathVuerd = vscode.Uri.file(path.join(this.extensionPath, "static", "vuerd-plugin-erd.umd.min.js"));
        const pathUndo = vscode.Uri.file(path.join(this.extensionPath, "static", "undomanager.js"));
        const pathMain = vscode.Uri.file(path.join(this.extensionPath, "static", "main.js"));
        const pathCss = vscode.Uri.file(path.join(this.extensionPath, "static", "vuerd-plugin-erd.css"));
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
exports.default = WebviewERD;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=WebviewERD.js.map