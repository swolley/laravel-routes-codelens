# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2025-02-27

### Added

- When a controller method is linked to multiple routes (e.g. GET and POST to the same URI), all routes are now shown on separate CodeLens lines above the method instead of only the last one
- Pure `buildCodeLensItems` module and unit tests for multi-route CodeLens logic (100% coverage)

### Changed

- Route list is stored as one array of route info per action, so multiple routes per action are preserved
- `RouteService.getRoutesForAction(action)` now returns an array of route info (replaces `getRouteForAction` which returned a single route)

## [0.1.2] - 2025-02-27

### Fixed

- Add `@types/vscode` so `vsce package` compiles successfully (vscode@0.9.9 types were outdated)

## [0.1.1] - 2025-02-27

### Added

- Check for `artisan` in workspace root before running `php artisan route:list`; skip command and return empty routes in non-Laravel projects to avoid errors and console noise

## [0.1.0] - 2025-02-27

### Added

- CodeLens above Laravel controller methods showing route method, URI, and route name
- Command "Laravel Routes: Refresh route list" to reload routes after editing `routes/*.php`
- Unit tests with full coverage for route parsing and controller parsing logic
