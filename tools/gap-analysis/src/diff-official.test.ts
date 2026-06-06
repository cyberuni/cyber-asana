import { describe, expect, it } from 'vitest'
import { catalogFromTools, diffToolLists } from './catalog-io.js'
import { diffCatalogs, renderIssueBody } from './diff-official.js'

describe('diffCatalogs', () => {
	it('detects added and removed official tools', () => {
		const baseline = catalogFromTools('baseline', ['get_task', 'create_tasks'])
		const fetched = catalogFromTools('fetched', ['get_task', 'delete_task'])
		const diff = diffCatalogs(baseline, fetched)

		expect(diff.added).toEqual(['delete_task'])
		expect(diff.removed).toEqual(['create_tasks'])
		expect(diff.unchanged).toEqual(['get_task'])
	})
})

describe('renderIssueBody', () => {
	it('includes added and removed tool lists', () => {
		const body = renderIssueBody({
			added: ['delete_task'],
			removed: ['create_tasks'],
			unchanged: ['get_task'],
			baseline_path: 'data/official-asana-mcp-baseline.json',
			fetched_at: '2026-05-25',
			tool_count_before: 2,
			tool_count_after: 2,
		})

		expect(body).toContain('`delete_task`')
		expect(body).toContain('`create_tasks`')
		expect(body).toContain('analyze-official-asana-mcp')
	})
})

describe('diffToolLists unchanged only', () => {
	it('returns empty added and removed when lists match', () => {
		const diff = diffToolLists(['a', 'b'], ['a', 'b'])
		expect(diff.added).toEqual([])
		expect(diff.removed).toEqual([])
		expect(diff.unchanged).toEqual(['a', 'b'])
	})
})
