import { describe, expect, it } from 'vitest'
import { parseDocumentedSubset } from '../skills/html-subset.js'
import {
	ASANA_HTML_REJECTED,
	ASANA_HTML_SUPPORTED,
	findHtmlSubsetProblems,
	findStatusHtmlProblems,
} from './html-subset.js'

describe('findStatusHtmlProblems', () => {
	it('accepts a body of bold lines and lists', () => {
		expect(findStatusHtmlProblems('<body><strong>Health</strong>\n<ul>\n<li>1 error</li>\n</ul>\n</body>')).toEqual([])
	})

	it('names a heading, which Asana answers by escaping the whole status update', () => {
		expect(findStatusHtmlProblems('<body><h2>Health</h2>\n<ul>\n<li>x</li>\n</ul>\n</body>')).toContain(
			'<h2> is not supported in a status update (Asana escapes the whole body); use <strong> for a heading',
		)
	})

	it('still reports what the general subset rejects', () => {
		expect(findStatusHtmlProblems('<p>x</p>')).toContain("<p> is not in Asana's HTML subset")
	})
})

describe('findHtmlSubsetProblems', () => {
	it('accepts a body of supported tags', () => {
		expect(
			findHtmlSubsetProblems('<body><h2>Health</h2>\n<ul>\n<li><strong>1</strong> error</li>\n</ul>\n</body>'),
		).toEqual([])
	})

	it('names each rejected tag and the missing body wrapper', () => {
		const problems = findHtmlSubsetProblems('<p>x<br></p>')
		expect(problems).toContain("<p> is not in Asana's HTML subset")
		expect(problems).toContain("<br> is not in Asana's HTML subset")
		expect(problems).toContain('the text must be wrapped in <body>')
	})

	it('flags a tag it does not know at all', () => {
		expect(findHtmlSubsetProblems('<body><blink>x</blink></body>')).toEqual(["<blink> is not in Asana's HTML subset"])
	})

	it('flags a <li> outside a list', () => {
		expect(findHtmlSubsetProblems('<body><li>x</li></body>')).toContain('<li> must sit inside <ul> or <ol>')
	})

	it('stays in step with the tags the tidy-description reference documents', () => {
		const documented = parseDocumentedSubset()
		expect([...ASANA_HTML_SUPPORTED].sort()).toEqual([...documented.supported].sort())
		// <li> is rejected only outside a list, which findHtmlSubsetProblems checks by position.
		expect([...documented.rejected].filter((t) => t !== '<li>').every((t) => ASANA_HTML_REJECTED.has(t))).toBe(true)
	})
})
