# Description templates

Load only when the user asks for a named template (step 3 of `tidy-description.md`). Map existing content into the sections; leave a section out rather than filling it with a placeholder.

## PRD

```html
<body><h1>Summary</h1>
One paragraph on what and why.

<h2>Goals</h2>
<ul><li>Goal one</li><li>Goal two</li></ul>

<h2>Non-goals</h2>
<ul><li>Explicitly out of scope</li></ul>

<h2>Acceptance criteria</h2>
<ol><li>Observable outcome</li><li>Observable outcome</li></ol>
</body>
```

## Research note

```html
<body><h1>Question</h1>
What are we trying to learn?

<h2>Findings</h2>
<ul><li><strong>Finding</strong> — evidence, with a <a href="https://example.com/source">source</a></li></ul>

<h2>Open questions</h2>
<ul><li>Still unknown</li></ul>
</body>
```

## Bug report

```html
<body><h1>Symptom</h1>
What the user sees.

<h2>Repro</h2>
<ol><li>Step</li><li>Step</li></ol>

<h2>Expected vs actual</h2>
<ul><li><strong>Expected</strong> — …</li><li><strong>Actual</strong> — …</li></ul>

<h2>Evidence</h2>
<pre>Error: value &lt; 0 not allowed
  at validate (input.ts:42)</pre>
</body>
```
