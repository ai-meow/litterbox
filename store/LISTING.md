# Chrome Web Store listing — copy/paste sheet

## Store listing tab

**Name** (from manifest): Litterbox for GitHub PRs

**Summary** (from manifest, ≤132 chars):
Scoop tests, snapshots and other noise out of GitHub pull request diffs, and see the +/− line count for what's left.

**Category:** Developer Tools
**Language:** English

**Description:**

Big pull requests are often mostly noise: test files, Jest snapshots, generated fixtures, database dumps. Litterbox scoops them out so you can review the code that actually matters.

On a pull request's "Files changed" tab, Litterbox adds an "Exclude files" box to GitHub's file filter menu (the button next to "Filter files…").

• Hide files by pattern: *.test.tsx, *.snap, **/__snapshots__/**, db/snapshots/** …
• Hidden files disappear from both the file tree and the diff.
• See the real line count: a small counter under the search box shows +added −removed for the files you're actually reviewing, and how much was hidden.
• Patterns are saved and synced across your Chrome profile.
• Exact numbers, read from GitHub's own page data, even for diffs that haven't loaded yet.

Pattern tips
– Comma or newline separated
– * matches anything except /, ** matches any path
– A pattern without a wildcard matches anywhere in the path

Privacy: no data collection, no analytics, no third-party servers. Your patterns are the only thing stored.

Open source (MIT): https://github.com/ai-meow/litterbox

Litterbox is not affiliated with or endorsed by GitHub.

**Graphics:**
- Store icon 128×128: `icons/icon-128.png`
- Screenshots 1280×800: `store/screenshot-1-diff.png`, `store/screenshot-2-menu.png`
- Small promo tile 440×280: `store/promo-small-440x280.png`
- Marquee promo tile 1400×560 (optional): `store/promo-marquee-1400x560.png`

**Homepage URL:** https://github.com/ai-meow/litterbox
**Support URL:** https://github.com/ai-meow/litterbox/issues

## Privacy practices tab

**Single purpose:**
Filter files out of GitHub pull request diffs by pattern and show the added/removed line count of the remaining files.

**Permission justification — storage:**
Saves the user's exclude patterns (e.g. "*.test.*, *.snap") so they persist across pull requests and sessions.

**Permission justification — host permission (content script on https://github.com/\*):**
The extension modifies the GitHub pull request "Files changed" page to hide excluded files and display line counts. It matches all of github.com because GitHub navigates between pages without full reloads, so the script must already be present when the user reaches a PR from any other GitHub page. It does nothing outside PR "changes"/"files" pages.

**Remote code:** No, I am not using remote code.

**Data usage:** check none of the data categories. Certify:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/ai-meow/litterbox/blob/main/PRIVACY.md

## Distribution tab

- Visibility: Public
- Regions: All regions
- Pricing: Free
