import { describe, expect, it } from 'vitest'
import { buildStoryCreateFields, buildStoryUpdateFields, validateCreatedAfter } from './write-options.js'

describe('stories/write-options parent_comment and created_after', () => {
	it('buildStoryCreateFields carries parent_comment', () => {
		expect(buildStoryCreateFields({ text: 'Agreed', parentComment: 'c1' })).toEqual({
			text: 'Agreed',
			parent_comment: 'c1',
		})
	})

	it('buildStoryUpdateFields never carries parent_comment', () => {
		expect(buildStoryUpdateFields({ text: 'Edit' })).toEqual({ text: 'Edit' })
	})

	it('validateCreatedAfter accepts an ISO 8601 date-time and rejects anything else', () => {
		expect(validateCreatedAfter('2026-11-01T00:00:00Z')).toBe('2026-11-01T00:00:00Z')
		expect(() => validateCreatedAfter('yesterday')).toThrow('created_after must be an ISO 8601 date-time')
	})
})

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

	it('buildStoryCreateFields accepts self-closing tags with trailing whitespace', () => {
		expect(
			buildStoryCreateFields({
				htmlText: '<body><br /></body>',
			}),
		).toEqual({
			html_text: '<body><br /></body>',
		})
	})

	it('buildStoryCreateFields accepts tags with attributes', () => {
		expect(
			buildStoryCreateFields({
				htmlText: '<body><div class="foo">Rich</div></body>',
			}),
		).toEqual({
			html_text: '<body><div class="foo">Rich</div></body>',
		})
	})

	it('buildStoryUpdateFields returns the replacement text', () => {
		expect(buildStoryUpdateFields({ text: 'Corrected' })).toEqual({ text: 'Corrected' })
	})

	it('buildStoryUpdateFields preserves valid html_text', () => {
		expect(buildStoryUpdateFields({ htmlText: '<body><strong>Corrected</strong></body>' })).toEqual({
			html_text: '<body><strong>Corrected</strong></body>',
		})
	})

	it('buildStoryUpdateFields rejects text and html_text together', () => {
		expect(() => buildStoryUpdateFields({ text: 'Plain', htmlText: '<body>Rich</body>' })).toThrow(
			'--text and --html-text are mutually exclusive',
		)
	})

	it('buildStoryUpdateFields rejects malformed html_text', () => {
		expect(() => buildStoryUpdateFields({ htmlText: '<body><strong>Rich</body>' })).toThrow(
			'html_text has unbalanced closing tags',
		)
	})

	it('buildStoryCreateFields carries is_pinned alongside the comment body', () => {
		expect(buildStoryCreateFields({ text: 'Pin me', isPinned: true })).toEqual({ text: 'Pin me', is_pinned: true })
	})

	it('buildStoryUpdateFields pins without replacing the comment body', () => {
		expect(buildStoryUpdateFields({ isPinned: true })).toEqual({ is_pinned: true })
	})

	it('buildStoryUpdateFields unpins without replacing the comment body', () => {
		expect(buildStoryUpdateFields({ isPinned: false })).toEqual({ is_pinned: false })
	})

	it('buildStoryUpdateFields names every option when nothing was provided', () => {
		expect(() => buildStoryUpdateFields({})).toThrow('Provide text, --html-text, --pin, --unpin, or --sticker')
	})

	it('buildStoryCreateFields carries sticker_name alongside the comment body', () => {
		expect(buildStoryCreateFields({ text: 'Nice', stickerName: 'trophy' })).toEqual({
			text: 'Nice',
			sticker_name: 'trophy',
		})
	})

	it('buildStoryUpdateFields sets a sticker without replacing the comment body', () => {
		expect(buildStoryUpdateFields({ stickerName: 'heart' })).toEqual({ sticker_name: 'heart' })
	})

	it('buildStoryCreateFields rejects a sticker Asana does not define, listing the ones it does', () => {
		expect(() => buildStoryCreateFields({ text: 'Nice', stickerName: 'rocket' })).toThrow(
			'sticker_name must be one of green_checkmark, people_dancing',
		)
	})
})
