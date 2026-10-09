import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRuntimeContext, type RuntimeContext } from '../composition.js'
import { buildErrorBody } from '../error-body.js'
import { isSystemTestEnabled, systemEnv } from '../testing/system.js'
import { parseDocumentedSubset } from './html-subset.js'

const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const systemEnabled = isSystemTestEnabled() && Boolean(workspaceGid)

const documented = parseDocumentedSubset()

/** Markup exercising each tag in a position where it is legal. */
const SUPPORTED_SAMPLE: Record<string, string> = {
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
const REJECTED_SAMPLE: Record<string, string> = {
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

let runtimeContext: RuntimeContext | undefined
let taskGid = ''

function getTaskApi() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext.tasks
}

async function readHtmlNotes(): Promise<string> {
	const task = await getTaskApi().getTask(taskGid)
	return String(task.html_notes ?? '')
}

/** One round trip: did Asana accept the markup? Read back separately only when needed. */
async function putHtmlNotes(html: string): Promise<{ ok: true } | { ok: false; message: string }> {
	try {
		await getTaskApi().updateTask(taskGid, { html_notes: html })
		return { ok: true }
	} catch (error) {
		// Surface Asana's own reason ("XML is invalid") rather than the bare "Bad Request",
		// so a drift failure names what changed.
		return { ok: false, message: buildErrorBody(error).error.message }
	}
}

describe.skipIf(!systemEnabled)('skills/asana tidy-description HTML subset system', { timeout: 30_000 }, () => {
	beforeAll(async () => {
		// Assigned to the caller so a crashed run leaves the scratch task in My Tasks
		// rather than orphaned in the workspace — task search is premium-only.
		const task = await getTaskApi().createTask(workspaceGid as string, '[cyber-asana system test] html subset probe', {
			assignee: 'me',
		})
		taskGid = String(task.gid)
	})

	afterAll(async () => {
		if (taskGid) await getTaskApi().deleteTask(taskGid)
	})

	it('has a probe sample for every documented tag', () => {
		// A tag added to tidy-description.md without a sample would otherwise go unverified.
		expect([...documented.supported].filter((tag) => !SUPPORTED_SAMPLE[tag])).toEqual([])
		expect([...documented.rejected].filter((tag) => !REJECTED_SAMPLE[tag])).toEqual([])
	})

	it.each([...documented.supported])('%s is still accepted', async (tag) => {
		const result = await putHtmlNotes(`<body>${SUPPORTED_SAMPLE[tag]}</body>`)
		expect(result.ok ? null : result.message, `${tag} is documented as supported but Asana rejected it`).toBeNull()
	})

	it.each([...documented.rejected])('%s is still rejected', async (tag) => {
		const result = await putHtmlNotes(`<body>${REJECTED_SAMPLE[tag]}</body>`)
		expect(result.ok, `${tag} is documented as rejected but Asana now accepts it`).toBe(false)
	})

	describe('documented pitfalls', () => {
		it('requires a bare <body> wrapper', async () => {
			expect(await putHtmlNotes('plain text')).toMatchObject({ ok: false })
			expect(await putHtmlNotes('<body class="x">text</body>')).toMatchObject({ ok: false })
		})

		it('rejects a raw < in text but accepts it escaped', async () => {
			expect(await putHtmlNotes('<body>if a < b</body>')).toMatchObject({ ok: false })
			expect(await putHtmlNotes('<body>if a &lt; b</body>')).toMatchObject({ ok: true })
		})

		it('rejects an unclosed tag', async () => {
			expect(await putHtmlNotes('<body><strong>oops</body>')).toMatchObject({ ok: false })
		})

		it('rejects <code> nested inside <pre>', async () => {
			expect(await putHtmlNotes('<body><pre><code>x</code></pre></body>')).toMatchObject({ ok: false })
		})

		it('rejects an anchor with no href and one with a relative href', async () => {
			expect(await putHtmlNotes('<body><a>x</a></body>')).toMatchObject({ ok: false })
			expect(await putHtmlNotes('<body><a href="/foo">x</a></body>')).toMatchObject({ ok: false })
		})

		it('preserves literal newlines as paragraph structure', async () => {
			expect(await putHtmlNotes('<body>one\n\ntwo</body>')).toMatchObject({ ok: true })
			expect(await readHtmlNotes()).toContain('one\n\ntwo')
		})

		it('leaves the stored description untouched when an update is rejected', async () => {
			expect(await putHtmlNotes('<body><h1>Good</h1>\n<a href="https://example.com">link</a></body>')).toMatchObject({
				ok: true,
			})
			const before = await readHtmlNotes()
			expect(await putHtmlNotes('<body><p>bad</p></body>')).toMatchObject({ ok: false })
			// Read rather than re-write — re-writing the good value would prove nothing.
			expect(await readHtmlNotes()).toBe(before)
		})
	})

	describe('normalization on save', () => {
		it('rewrites <b>/<i> and strips <span>', async () => {
			expect(await putHtmlNotes('<body><b>x</b></body>')).toMatchObject({ ok: true })
			expect(await readHtmlNotes()).toContain('<strong>')
			expect(await putHtmlNotes('<body><span>x</span></body>')).toMatchObject({ ok: true })
			expect(await readHtmlNotes()).not.toContain('<span>')
		})
	})
})
