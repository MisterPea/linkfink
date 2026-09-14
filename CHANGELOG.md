# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

Version numbering restarts at `0.1.0` with the fork/rename below — see
[README.md § Fork](README.md) for the pre-rename history under the
original project name.

## [Unreleased]

### Changed
- Removed the `<all_urls>` host permission from `manifest.json`; the
  extension only needs `activeTab`, which is already granted per-invocation
  and doesn't require a standing host permission.
- Bumped `esbuild` (dev dependency) from `0.20.1` to `^0.25.0` to resolve a
  moderate-severity advisory ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99))
  allowing any website to send requests to the esbuild dev server and read
  the response. Dev-server-only; no production impact. No breaking changes
  encountered — build and typecheck verified.
- Bumped extension version `0.1.0` → `0.1.1`.

### Added
- Footer: "Issues / Suggestions" link alongside the existing GitHub link.

## [0.1.0] - 2026-08-27

### Changed
- **Renamed the project from "Link Grabber" to "Linkfink".** This fork of
  Don Tong's original [Link Grabber](https://github.com/7fffffff/linkgrabber)
  continues development independently after the upstream author declined
  further contributions. Version numbering reset to `0.1.0` to mark this
  as the start of Linkfink's own release history (prior `0.0.2`–`0.6.1`
  versions belong to the original Link Grabber lineage).
- Converted the codebase from JavaScript to TypeScript; styles converted
  from plain CSS to SCSS.
- Reworked the UI: added a footer, updated extension icons, moved
  Options/Settings into a modal, added a Light/Dark mode toggle and
  link-opening options.

### Added
- Filter feature: ability to hide text-fragment links.
- Option to ignore same-origin sub-domains when extracting links.
