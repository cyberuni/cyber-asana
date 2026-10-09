import { describe, expect, it } from 'vitest'
import { parseAsanaUrl } from './parse.js'

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

	it.each([
		['a non-digit workspace or project GID', 'https://app.asana.com/1/abc/project/xyz'],
		['a non-digit task GID', 'https://app.asana.com/1/8801234500011/project/8801234500022/task/my-task'],
		['a non-digit list-view GID', 'https://app.asana.com/1/8801234500011/project/8801234500022/list/board'],
		['a non-digit GID in a legacy path', 'https://app.asana.com/0/8801234500011/inbox'],
	])('returns unknown for %s', (_label, url) => {
		expect(parseAsanaUrl(url)).toEqual({
			kind: 'unknown',
			url,
			workspace_gid: null,
			project_gid: null,
			task_gid: null,
			list_view_gid: null,
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
