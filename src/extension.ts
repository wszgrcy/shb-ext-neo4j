import * as vscode from 'vscode';
import manifestFactory from './manifest';
import { shbPluginRegister } from '@shenghuabi/sdk';

let dispose$$: Promise<() => {}> | undefined;
export function activate(context: vscode.ExtensionContext) {
  dispose$$ = shbPluginRegister(context, manifestFactory({}));
}
export function deactivate() {
  dispose$$?.then((fn) => fn());
}
