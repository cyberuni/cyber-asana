import { describe, expect, it } from 'vitest'
import { checkHtml } from './check.js'
import { fixHtml } from './fix.js'
import { SURFACES, type Surface } from './surfaces.js'

describe('fixHtml', () => {
	it('wraps the text in a bare body', () => {
		expect(fixHtml('<h1>x</h1>', 'task-notes')).toBe('<body><h1>x</h1></body>')
	})

	it('strips attributes from an existing body', () => {
		expect(fixHtml('<body class="x"><strong>a</strong></body>', 'task-notes')).toBe('<body><strong>a</strong></body>')
	})

	it('renames <b> and <i> to the tags Asana keeps', () => {
		expect(fixHtml('<b>a</b> <i>b</i>', 'task-notes')).toBe('<body><strong>a</strong> <em>b</em></body>')
	})

	it('turns paragraphs and line breaks into newlines', () => {
		expect(fixHtml('<p>a</p><p>b<br>c</p>', 'task-notes')).toBe('<body>a\n\nb\nc</body>')
	})

	it('flattens h4 to h6 to h3 in task notes', () => {
		expect(fixHtml('<h5>x</h5>', 'task-notes')).toBe('<body><h3>x</h3></body>')
	})

	it('writes every heading as a bold line in a status update', () => {
		expect(fixHtml('<h2>Health</h2>\n<ul><li>x</li></ul>', 'status-update')).toBe(
			'<body><strong>Health</strong>\n<ul><li>x</li></ul></body>',
		)
	})

	it('puts a status-update heading on its own line', () => {
		expect(fixHtml('<h2>Health</h2>all good', 'status-update')).toBe('<body><strong>Health</strong>\nall good</body>')
	})

	it('renames <b> and <i> that carry attributes', () => {
		expect(fixHtml('<b class="x">a</b><i id="y">b</i>', 'task-notes')).toBe('<body><strong>a</strong><em>b</em></body>')
	})

	it('maps the tags Asana rejects to the nearest it keeps', () => {
		expect(fixHtml('<del>a</del><th>b</th><span>c</span><sub>d</sub>', 'task-notes')).toBe(
			'<body><s>a</s><td>b</td>cd</body>',
		)
	})

	it('collapses runs of blank lines', () => {
		expect(fixHtml('<p>a</p>\n\n\n\n<p>b</p>', 'task-notes')).toBe('<body>a\n\nb</body>')
	})

	it('leaves what it cannot repair for check to report', () => {
		expect(checkHtml(fixHtml('<img src="https://e.com/a.png">', 'task-notes'), 'task-notes')).toContain(
			"<img> is not in Asana's HTML subset",
		)
	})

	it.each(SURFACES)('is idempotent on %s', (surface: Surface) => {
		const messy = '<p>one</p>\n\n\n\n<b>two</b><h4>three</h4><h1>four</h1><span>five</span>'
		const once = fixHtml(messy, surface)
		expect(fixHtml(once, surface)).toBe(once)
	})

	it.each(SURFACES)('produces output that check accepts on %s', (surface: Surface) => {
		const messy = '<p>one</p><b>two</b><ul><li>x</li></ul><a href="https://example.com">link</a>'
		expect(checkHtml(fixHtml(messy, surface), surface)).toEqual([])
	})
})
