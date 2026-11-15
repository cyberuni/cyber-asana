// Shared by the live probes (`*.system.ts`): one sample per tag, in a position where Asana's
// verdict on the tag itself is what decides the outcome.

/** Markup exercising each tag in a position where it is legal. */
export const SUPPORTED_SAMPLE: Record<string, string> = {
	'<body>': 'plain text',
	'<h1>': '<h1>x</h1>',
	'<h2>': '<h2>x</h2>',
	'<h3>': '<h3>x</h3>',
	'<strong>': '<strong>x</strong>',
	'<em>': '<em>x</em>',
	'<u>': '<u>x</u>',
	'<s>': '<s>x</s>',
	'<code>': '<code>x</code>',
	'<pre>': '<pre>x</pre>',
	'<ul>': '<ul><li>x</li></ul>',
	'<ol>': '<ol><li>x</li></ol>',
	'<li>': '<ul><li>x</li></ul>',
	'<a>': '<a href="https://example.com">x</a>',
	'<blockquote>': '<blockquote>x</blockquote>',
	'<table>': '<table><tr><td>x</td></tr></table>',
	'<tr>': '<table><tr><td>x</td></tr></table>',
	'<td>': '<table><tr><td>x</td></tr></table>',
	'<hr>': '<hr />',
	'<mark>': '<mark>x</mark>',
}

/** Markup exercising each tag in the position the docs claim Asana refuses. */
export const REJECTED_SAMPLE: Record<string, string> = {
	'<p>': '<p>x</p>',
	'<br>': 'a<br>b',
	'<div>': '<div>x</div>',
	'<h4>': '<h4>x</h4>',
	'<h5>': '<h5>x</h5>',
	'<h6>': '<h6>x</h6>',
	'<img>': '<img src="https://example.com/a.png" />',
	'<del>': '<del>x</del>',
	'<sub>': '<sub>x</sub>',
	'<sup>': '<sup>x</sup>',
	'<th>': '<table><tr><th>x</th></tr></table>',
	'<li>': '<li>orphan</li>',
}

export type ProbeOutcome = { outcome: 'accepted' } | { outcome: 'escaped' } | { outcome: 'rejected'; message: string }

/**
 * What Asana did with `<body>sample</body>` on a surface: refused it, kept the markup, or stored it
 * as literal text. The last is the status-update heading failure mode: the write succeeds and the
 * read-back holds `&lt;body&gt;`.
 */
export function classifyReadBack(stored: string): ProbeOutcome {
	return stored.includes('&lt;body&gt;') || /&lt;\/?[a-z][a-z0-9]*[ &>]/i.test(stored)
		? { outcome: 'escaped' }
		: { outcome: 'accepted' }
}
