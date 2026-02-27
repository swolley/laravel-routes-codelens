# Laravel Routes CodeLens

A VS Code extension that shows Laravel route information (HTTP method, URI, route name) above controller methods via CodeLens. No annotations are written into your source files—everything is displayed only in the editor.

## Features

- **CodeLens above controller methods**: When you open a Laravel controller, each method that is bound to a route shows a line above it with the corresponding route (e.g. `GET /users (users.index)`).
- **No file changes**: Route info is shown only in the UI; your PHP files stay untouched.
- **Refresh on demand**: Use the command **Laravel Routes: Refresh route list** to reload routes after changing `routes/*.php`.

## Requirements

- VS Code 1.90.0 or newer
- A Laravel project with `php` and `artisan` available in the environment (the extension runs `php artisan route:list --json` in the workspace root)

## Installation

### From a VSIX package (e.g. GitHub Releases)

1. Download the `.vsix` file from the [Releases](https://github.com/YOUR_USERNAME/laravel-routes-codelens/releases) page.
2. In VS Code: **Extensions** → **...** (top right) → **Install from VSIX...** → select the downloaded file.

### From source (development)

1. Clone the repository.
2. Run `npm install` and `npm run compile`.
3. Open the folder in VS Code and press **F5** to launch the Extension Development Host; open your Laravel project in that window.

## Usage

1. Open a Laravel workspace (the folder that contains `artisan` and `routes/`).
2. Open a controller file under `app/Http/Controllers/`.
3. CodeLens lines appear above methods that are registered as route actions (e.g. `GET /users (users.index)`).
4. After changing routes, run **Laravel Routes: Refresh route list** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to update the list.

## Development

### Scripts

| Command           | Description                    |
|------------------|--------------------------------|
| `npm run compile`| Build the extension (TypeScript → `out/`) |
| `npm run watch`  | Watch and recompile on change  |
| `npm test`       | Run unit tests (Jest)          |
| `npm run test:watch` | Run tests in watch mode   |
| `npm run test -- --coverage` | Run tests with coverage |

### Project structure

- `src/extension.ts` – Extension entry, CodeLens provider registration, Artisan runner.
- `src/routeService.ts` – Loads and caches route list (injectable runner for tests).
- `src/routeListParser.ts` – Parses `php artisan route:list --json` output (pure function).
- `src/controllerParser.ts` – Extracts controller FQCN and public methods from PHP source (pure function).
- `src/__tests__/` – Unit tests (no Laravel app required; Artisan output is mocked).

### Packaging and release

See [RELEASE.md](RELEASE.md) for how to create a VSIX package and publish a GitHub release.

## License

MIT
