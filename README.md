[![License: GPL-2.0-or-later](https://img.shields.io/badge/License-GPL--2.0--or--later-blue.svg)](https://spdx.org/licenses/GPL-2.0-or-later.html)

# Imatic Formatting

Converts Markdown to HTML and adds a Vditor Markdown/WYSIWYG editor to MantisBT.

## Installation

The release archive is ready to install without Composer, npm, or external CDN access:

1. Download `ImaticFormatting-<version>.zip` from the GitHub release.
2. Extract its `ImaticFormatting` directory into the MantisBT `plugins` directory.
3. Register **Imatic Formatting** under **Manage > Manage Plugins**.

To install from a source checkout instead, run:

```shell
composer install --no-dev
npm ci
npm run build:prod
```

The Composer package can also be installed from the MantisBT directory:

```shell
composer require imatic-it/imatic-formatting:dev-master
```

## Vditor

Vditor and all required runtime assets are bundled locally. The browser does not contact a public CDN.

Configure the editor with `$g_plugin_ImaticFormatting_vditor_editor`:

```php
$g_plugin_ImaticFormatting_vditor_editor = [
    'enabled' => true,
    'textAreas' => [
        'description',
        'steps_to_reproduce',
        'additional_info',
        'additional_information',
        'bugnote_text',
    ],
    'options' => [
        'mode' => 'sv', // sv, wysiwyg, or ir
        'previewMode' => 'editor', // editor or both
        'height' => false, // false derives the height from the MantisBT textarea
        'sanitize' => true,
        'toolbar' => [
            'headings', 'bold', 'italic', 'strike', '|',
            'line', 'quote', 'list', 'ordered-list', 'check', '|',
            'table', 'link', '|', 'inline-code', 'code', '|',
            'undo', 'redo', '|', 'edit-mode', 'both', 'preview',
        ],
    ],
];
```

The default `sv` mode provides raw Markdown editing. The preview button switches between editing and rendered preview, while `previewMode => 'both'` displays a vertical split view.

Existing `$g_plugin_ImaticFormatting_toastui_editor` configuration remains supported as a fallback. Existing per-user Toast UI enable/disable preferences are also honored until the user saves the new Vditor preference.

Toast UI's custom DOMPurify allow-list and global shortcut-disable options have no direct Vditor equivalents. Vditor's built-in Markdown sanitization is enabled by default.

## User Mentions

Typing `@` in a supported field shows enabled users who can view the current project or issue. Selecting a friendly display name inserts the account's actual `@username`.

Supported fields include:

- `#summary`
- `#description`
- `#steps_to_reproduce`
- `#additional_info` and `#additional_information`
- `#bugnote_text`

Autocomplete uses the locally bundled Tribute.js in Vditor and plain textarea modes. Mention rendering and notifications are handled by MantisBT's `mention_format_text()` implementation.

## Code Highlighting

Prism code highlighting can be disabled with:

```php
$g_plugin_ImaticFormatting_include_prism = false;
```

## Release Package

Create a production build and ready-to-install archive with:

```shell
npm ci
npm run release
```

This writes `dist/ImaticFormatting-<version>.zip` and its SHA-256 checksum. Composer is required only on the build machine. Pushing a `v*` tag runs the same process in GitHub Actions and attaches the artifacts to the GitHub release.

## Preview Pages

Rendered formatting examples are available under **Manage > Manage Plugins > Imatic Formatting**, or directly at:

```text
/plugin.php?page=ImaticFormatting/test-issue-previews
```

These pages test server-side Markdown and HTML rendering. Editor behavior should be tested on normal MantisBT issue and bugnote forms.
