import { describe, expect, it } from 'vitest'
import { parseAsanaUrl } from './url.js'

describe('parseAsanaUrl', () => {
	it('parses project list view URLs', () => {
		expect(
			parseAsanaUrl('https://app.asana.com/1/1067629843637/project/1215109751173511/list/1215109875390628'),
		).toEqual({
			kind: 'project_list',
			url: 'https://app.asana.com/1/1067629843637/project/1215109751173511/list/1215109875390628',
			workspace_gid: '1067629843637',
			project_gid: '1215109751173511',
			task_gid: null,
			list_view_gid: '1215109875390628',
		})
	})

	it('parses project task URLs', () => {
		expect(
			parseAsanaUrl('https://app.asana.com/1/1067629843637/project/1215109751173511/task/1215109875240682'),
		).toEqual({
			kind: 'project_task',
			url: 'https://app.asana.com/1/1067629843637/project/1215109751173511/task/1215109875240682',
			workspace_gid: '1067629843637',
			project_gid: '1215109751173511',
			task_gid: '1215109875240682',
			list_view_gid: null,
		})
	})

	it('parses project-only URLs', () => {
		expect(parseAsanaUrl('https://app.asana.com/1/1067629843637/project/1215109751173511')).toEqual({
			kind: 'project',
			url: 'https://app.asana.com/1/1067629843637/project/1215109751173511',
			workspace_gid: '1067629843637',
			project_gid: '1215109751173511',
			task_gid: null,
			list_view_gid: null,
		})
	})

	it('parses legacy /0/ workspace task URLs', () => {
		expect(parseAsanaUrl('https://app.asana.com/0/1067629843637/1215109875240682')).toEqual({
			kind: 'legacy_task',
			url: 'https://app.asana.com/0/1067629843637/1215109875240682',
			workspace_gid: '1067629843637',
			project_gid: null,
			task_gid: '1215109875240682',
			list_view_gid: null,
		})
	})

	it('strips query strings and hashes before parsing', () => {
		expect(
			parseAsanaUrl(
				'https://app.asana.com/1/1067629843637/project/1215109751173511/list/1215109875390628?focus=true#comment',
			),
		).toMatchObject({
			kind: 'project_list',
			project_gid: '1215109751173511',
			list_view_gid: '1215109875390628',
		})
	})

	it('returns unknown for unrecognized URLs', () => {
		expect(parseAsanaUrl('https://example.com/not-asana')).toEqual({
			kind: 'unknown',
			url: 'https://example.com/not-asana',
			workspace_gid: null,
			project_gid: null,
			task_gid: null,
			list_view_gid: null,
		})
	})

	it('throws for empty input', () => {
		expect(() => parseAsanaUrl('')).toThrow('URL is required')
	})
})
