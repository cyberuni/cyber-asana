import { describe, expect, it } from 'vitest'
import { checkHtml } from './check.js'

describe('checkHtml on task-notes', () => {
	it('accepts a body of supported tags', () => {
		expect(
			checkHtml('<body><h2>Health</h2>\n<ul>\n<li><strong>1</strong> error</li>\n</ul>\n</body>', 'task-notes'),
		).toEqual([])
	})

	it('names each rejected tag and the missing body wrapper', () => {
		const problems = checkHtml('<p>x<br></p>', 'task-notes')
		expect(problems).toContain("<p> is not in Asana's HTML subset")
		expect(problems).toContain("<br> is not in Asana's HTML subset")
		expect(problems).toContain('the text must be wrapped in <body>')
	})

	it('flags a tag it does not know at all', () => {
		expect(checkHtml('<body><blink>x</blink></body>', 'task-notes')).toEqual(["<blink> is not in Asana's HTML subset"])
	})

	it('flags a <li> outside a list', () => {
		expect(checkHtml('<body><li>x</li></body>', 'task-notes')).toContain('<li> must sit inside <ul> or <ol>')
	})

	it('allows h1 to h3 but not h4', () => {
		expect(checkHtml('<body><h3>x</h3></body>', 'task-notes')).toEqual([])
		expect(checkHtml('<body><h4>x</h4></body>', 'task-notes')).toEqual(["<h4> is not in Asana's HTML subset"])
	})
})

describe('checkHtml on status-update', () => {
	it('accepts a body of bold lines and lists', () => {
		expect(checkHtml('<body><strong>Health</strong>\n<ul>\n<li>1 error</li>\n</ul>\n</body>', 'status-update')).toEqual(
			[],
		)
	})

	it('names a heading, which Asana answers by escaping the whole status update', () => {
		expect(checkHtml('<body><h2>Health</h2>\n<ul>\n<li>x</li>\n</ul>\n</body>', 'status-update')).toContain(
			'<h2> is not supported in a status update (Asana escapes the whole body); use <strong> for a heading',
		)
	})

	it('reports each heading level once, however often it appears', () => {
		const problems = checkHtml('<body><h1>a</h1><h1>b</h1></body>', 'status-update')
		expect(problems.filter((p) => p.startsWith('<h1>'))).toHaveLength(1)
	})

	it('still reports what the general subset rejects', () => {
		expect(checkHtml('<p>x</p>', 'status-update')).toContain("<p> is not in Asana's HTML subset")
	})
})
