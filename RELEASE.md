# Creating a release and package

This document describes how to build the VS Code extension package (`.vsix`) and create a GitHub release.

## Prerequisites

- Node.js and npm installed
- [vsce](https://github.com/microsoft/vscode-vsce) is already a dev dependency; you can also install it globally: `npm install -g @vscode/vsce`
- A public GitHub repository for the project

## 1. Bump version

Edit `package.json` and set the `version` field (e.g. `"0.1.0"`). Use [Semantic Versioning](https://semver.org/) (e.g. `0.1.0` for first release, then `0.1.1` for patches, `0.2.0` for new features).

## 2. Build and test

```bash
npm ci
npm run compile
npm test
```

## 3. Create the VSIX package

From the extension root directory:

```bash
npx vsce package
```

This produces a file like `laravel-routes-codelens-0.1.0.vsix`. Do **not** commit this file (it is listed in `.gitignore`); use it for installation and for uploading to a GitHub release.

## 4. Create a GitHub release

1. On GitHub, open your repository → **Releases** → **Create a new release**.
2. Choose a **tag** (e.g. `v0.1.0`). You can create the tag from the release UI or beforehand with `git tag v0.1.0`.
3. Set the **Release title** (e.g. `v0.1.0`) and add a short description (e.g. changelog or “First release”).
4. Under **Assets**, click **Attach binaries** and upload the `.vsix` file (`laravel-routes-codelens-0.1.0.vsix`).
5. Publish the release.

Users can then install the extension by downloading the `.vsix` from the release page and using **Install from VSIX...** in VS Code.

## 5. (Optional) Publish to the VS Code Marketplace

If you want the extension to be installable with “Install Extension” by name:

1. Create a [Visual Studio Marketplace](https://marketplace.visualstudio.com/) publisher account (Azure DevOps).
2. Run:

   ```bash
   npx vsce publish
   ```

   You will be prompted for a Personal Access Token (PAT) with the “Marketplace (Publish)” scope. Use the same publisher ID you created.

After publishing, the extension can be found by searching “Laravel Routes CodeLens” in the Extensions view.
