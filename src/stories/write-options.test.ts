import { describe, expect, it } from 'vitest'
import { buildStoryCreateFields } from './write-options.js'

describe('stories/write-options', () => {
	it('buildStoryCreateFields rejects text and html_text together', () => {
		expect(() =>
			buildStoryCreateFields({
				text: 'Plain',
				htmlText: '<body>Rich</body>',
			}),
		).toThrow('--text and --html-text are mutually exclusive')
	})

	it('buildStoryCreateFields requires either text or html_text', () => {
		expect(() => buildStoryCreateFields({})).toThrow('Provide either text or --html-text')
	})

	it('buildStoryCreateFields rejects html_text without a body root', () => {
		expect(() =>
			buildStoryCreateFields({
				htmlText: '<strong>Rich</strong>',
			}),
		).toThrow('html_text must be wrapped in a single <body>...</body> root element')
	})

	it('buildStoryCreateFields rejects unbalanced html_text tags', () => {
		expect(() =>
			buildStoryCreateFields({
				htmlText: '<body><strong>Rich</body>',
			}),
		).toThrow('html_text has unbalanced closing tags')
	})

	it('buildStoryCreateFields preserves html_text when valid', () => {
		expect(
			buildStoryCreateFields({
				htmlText: '<body><strong>Rich</strong></body>',
			}),
		).toEqual({
			html_text: '<body><strong>Rich</strong></body>',
		})
	})
})
