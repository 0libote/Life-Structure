# Life Structure

Life Structure adds a calm, full-page activity heatmap to Obsidian. It records
the notes you create and edit, shows year and month views, and lets you select a
day to record extra effort.

## Use

Open **Life Structure: Open heatmap** from the command palette or select its
bar-chart icon in the ribbon. Select any current or past day to cycle its
activity level.

## Install for development

```sh
bun install
bun run build
```

Copy this repository into your vault's `.obsidian/plugins/life-structure`
directory, then enable **Life Structure** under **Settings → Community
plugins**.

Run `bun run dev` while developing and `bun run check` before committing.

## Release

Keep the version in `package.json`, `manifest.json`, and `versions.json` in
sync, then push a tag with that exact version:

```sh
git tag 0.4.0
git push origin 0.4.0
```

GitHub Actions builds and attests the plugin, then creates a draft release.
Review its generated notes and publish it.

## License

[MIT](LICENSE)
