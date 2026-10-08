# Tidy description

Clean up an Asana task or project description without rewriting it, or write one as rich text that
Asana accepts.

This file is the one home of the description-tidying procedure. The `asana` skill routes here for a
model-triggered request, and the `/cyber-asana:tidy-description` command routes here for an explicit
one.

## When to use

- The user wants an existing description tidied up — stray blank lines, typos, broken formatting, a wall of unpunctuated text.
- The user wants a description written or restructured as rich text.
- Recovering from `Asana API error: XML is invalid` (or `Rich text should be wrapped in <body> tag`).

Plain prose with no formatting needs no HTML — use `--notes` / `notes` instead.

## Instructions

### 1. Read the current description

```sh
cyber-asana task get <gid> --json
```

Always edit from `html_notes`. `task get` returns it unconditionally — an empty description comes back as `<body></body>`, never absent — so there is no case where you need the plain-text `notes` projection, which drops every link and list.

### 2. Clean it up — light by default

**The default is a copy-edit, not a rewrite.** Preserve the author's message, wording, and structure. The result should read as the same person's text with the noise removed.

Do:

- Collapse runs of three or more blank lines to one.
- Strip trailing whitespace and stray leading indentation.
- Fix obvious typos and misspellings.
- Fix punctuation and capitalization that are plainly wrong.
- Repair broken markup — an unclosed tag, a list where some items are `-` and others `*`, a heading that lost its marker.
- Split a run-on wall of text at sentence boundaries the author clearly intended.
- Turn an existing dash-or-number list into a real `<ul>`/`<ol>`.

Do **not**, unless asked:

- Add emoji.
- Add, remove, or reorder sections.
- Add headings the author did not write.
- Rewrite for tone, voice, or concision.
- Add content, context, links, or claims that were not there.
- Delete anything that carries meaning — including apparent digressions and open questions.
- "Improve" a terse description by padding it out.

If the text is genuinely unclear, keep the author's words and ask rather than guessing at the intent.

Report what you changed before applying it, so the author can see that the meaning survived.

### 3. Apply requested modifiers

Only when the user asks for them, in the same request or a follow-up. Each is opt-in and composable:

| Ask | Do |
| --- | --- |
| "add emoji" / "make it scannable" | Prefix each heading with one emoji matching the section. One per heading, never mid-sentence. |
| "use the PRD / bug / research template" | Load [`tidy-description-templates.md`](tidy-description-templates.md), then restructure into the matching skeleton, mapping existing content into sections and leaving absent sections out. |
| "make it more formal / friendlier / terser" | Rewrite for tone. This is the one case where wording changes are the point. |
| "back up the claims" / "add sources" | Research the assertions, then add `<a href="...">` citations. Never cite a source you did not read. Flag any claim you could not support instead of quietly dropping it. |

A template modifier is the only reason to add or reorder sections. When it moves content, move it — do not paraphrase it on the way.

### 4. Write it back

Wrap the whole document in a bare `<body>` — required, and it must carry no attributes.

```sh
cyber-asana task update <gid> --html-notes '<body><h1>Summary</h1>Ship the thing.</body>'
```

`project update` takes `--html-notes` too. `--notes` and `--html-notes` are mutually exclusive. With the cyber-asana MCP server enabled, the equivalents are `asana_task_update` / `asana_project_update` with `html_notes`.

Read the task back afterward — Asana normalizes on save (`<b>`→`<strong>`, `<span>` stripped to text, list attributes dropped), so what you sent is not always what is stored.

## Asana's HTML subset

Verified against the live Asana API (`PUT /tasks/{gid}`, 2026-08).

**Supported**

| Tag | Notes |
| --- | --- |
| `<body>` | Required outermost wrapper, no attributes |
| `<h1>` `<h2>` `<h3>` | Headings — `<h4>`–`<h6>` are rejected |
| `<strong>` `<em>` `<u>` `<s>` | `<b>` → `<strong>`, `<i>` → `<em>` on save |
| `<code>` | Inline code |
| `<pre>` | Code block; `data-language` attribute is kept |
| `<ul>` `<ol>` `<li>` | Nesting allowed, including `<ol>` inside `<ul>` |
| `<a href="...">` | `href` (or `data-asana-gid`) required; absolute URL only |
| `<blockquote>` | Multi-line allowed |
| `<table>` `<tr>` `<td>` | `<th>` is rejected — use `<td>` for the header row |
| `<hr>` | Normalized to `<hr />` |
| `<mark>` | Highlight; Asana injects its own color attributes |

**Rejected — these are what produce `XML is invalid`**

`<p>` · `<br>` · `<div>` · `<h4>`–`<h6>` · `<img>` · `<del>` · `<sub>` · `<sup>` · `<th>` · `<li>` outside a list

`<span>` is accepted but silently stripped to its text.

`<pre><code>` nested together fails with an opaque *"unexpected error occurred"* — use `<pre>` alone.

### Line breaks are literal newlines

There is no `<p>` and no `<br>`. Separate blocks with real newline characters inside `<body>`; Asana preserves them. A cleanup pass therefore collapses runs of blank lines rather than deleting them.

```html
<body><h1>Summary</h1>
First paragraph.

Second paragraph.</body>
```

For multi-line content from a POSIX shell, use a quoted heredoc so the newlines survive (the MCP `html_notes` parameter, if enabled, avoids shell quoting entirely):

```sh
cyber-asana task update <gid> --html-notes "$(cat <<'HTML'
<body><h1>Summary</h1>
Ship the thing.
</body>
HTML
)"
```

### Escape `<`, `>` in text

A raw `<` or `>` outside a tag is rejected with `Malformed rich text. Found < or > that was not part of tag.` Escape them as `&lt;` / `&gt;` everywhere — including inside `<code>` and `<pre>`, which do **not** suppress parsing.

```html
<body><pre>&lt;h2&gt;Title&lt;/h2&gt;</pre></body>
```

`&` may be written raw; Asana normalizes it to `&amp;`, in text and in `href` alike. Every tag must be closed — an unclosed `<strong>` is rejected.

## Markdown → Asana HTML

| Markdown | Asana |
| --- | --- |
| `# H1` / `## H2` / `### H3` | `<h1>` / `<h2>` / `<h3>` |
| `#### H4` and deeper | Flatten to `<h3>`, or `<strong>` on its own line |
| Paragraph break | Blank line (literal newline), never `<p>` |
| `**bold**` / `*italic*` | `<strong>` / `<em>` |
| `` `code` `` | `<code>` |
| ```` ```ts ... ``` ```` | `<pre data-language="typescript">…</pre>`, contents escaped |
| `- item` / `1. item` | `<ul><li>…</li></ul>` / `<ol><li>…</li></ol>` |
| `[text](url)` | `<a href="url">text</a>` — absolute URL only |
| `> quote` | `<blockquote>` |
| `---` | `<hr />` |
| `- [ ] todo` | `<ul><li>☐ todo</li></ul>` — checklist markup is stripped |

## Troubleshooting

A rejected update writes nothing — the stored description is left byte-identical. Fix the HTML and retry; there is nothing to recover.

| Error | Cause |
| --- | --- |
| `Rich text should be wrapped in <body> tag.` | Missing `<body>`, or `<body>` carries an attribute |
| `XML is invalid` | An unsupported tag — check `<p>`, `<br>`, `<div>`, `<h4>`+, `<img>` |
| `XML is invalid: Malformed rich text. Found < or > that was not part of tag.` | Unescaped `<` or `>` in text |
| `XML is invalid: Malformed rich text. XML tag was not closed.` | Unclosed tag |
| `One of data-asana-gid or href is required in anchor attributes` | `<a>` with no `href` |
| `invalid protocol in HREF field` | Relative or non-http(s) `href` |
| `Oops! An unexpected error occurred…` | `<code>` nested inside `<pre>` |

## References

- [`tidy-description-templates.md`](tidy-description-templates.md) — PRD, research-note, and bug-report skeletons. Load only when the user asks for a named template (step 3).
