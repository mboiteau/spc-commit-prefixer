import * as vscode from "vscode";
import { GitExtension, Repository } from "./api/git";

function getGitExtension() {
  const vscodeGit = vscode.extensions.getExtension<GitExtension>("vscode.git");
  const gitExtension = vscodeGit && vscodeGit.exports;
  return gitExtension && gitExtension.getAPI(1);
}

async function buildCommit(repository: Repository) {
  let commitMessage: string = "";

  const { pluginNames, commitPrefixes } =
    vscode.workspace.getConfiguration("SPC-CommitPrefixer");

  const selectedPluginName = await vscode.window.showQuickPick(
    [...pluginNames, "Generic update"],
    {
      placeHolder: "Select the plugin that you want to apply to your commit",
    }
  );
  const selectedPrefix = await vscode.window.showQuickPick(commitPrefixes, {
    placeHolder: "Select a prefix that you want to apply to your commit",
  });

  if (!selectedPrefix) {
    return;
  }

  const userCommitInput = await vscode.window.showInputBox({
    title: "Commit Message",
    placeHolder: "Enter your commit message",
    prompt: "Enter your commit message",
  });

  if (!userCommitInput) {
    return;
  }

  const transformedSelectedPluginName =
    !selectedPluginName || selectedPluginName === "Generic update"
      ? ""
      : `(${selectedPluginName})`;
  commitMessage = `${selectedPrefix}${transformedSelectedPluginName}: ${userCommitInput}`;
  repository.inputBox.value = commitMessage;
}

export function activate(context: vscode.ExtensionContext) {
  const disposables: vscode.Disposable[] = [];
  const showPrefixPopup = vscode.commands.registerCommand(
    "spc-commit-prefixer.showPrefixPopup",
    async (uri?) => {
      const git = getGitExtension();

      if (!git) {
        vscode.window.showErrorMessage("Unable to load Git Extension");
        return;
      }

      vscode.commands.executeCommand("workbench.view.scm");

      if (uri) {
        const selectedRepository = git.repositories.find((repository) => {
          return repository.rootUri.path === uri.rootUri.path;
        });

        if (selectedRepository) {
          await buildCommit(selectedRepository);
        }
      } else {
        for (const repo of git.repositories) {
          await buildCommit(repo);
        }
      }
    }
  );
  disposables.push(showPrefixPopup);
  context.subscriptions.push(...disposables);
}

export function deactivate() {}
