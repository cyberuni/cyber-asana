import { describe, expect, it } from 'vitest'
import {
	checkParameterCoverage,
	findWrappedOperations,
	type ParameterCoverage,
	renderParameterReport,
} from './parameter-coverage.js'
import { restCatalogFromOperations } from './rest-catalog.js'
import type { RestOperation } from './rest-types.js'

const setParent: RestOperation = {
	operationId: 'setParentForTask',
	method: 'POST',
	path: '/tasks/{task_gid}/setParent',
	tag: 'Tasks',
	deprecated: false,
	parameters: [
		{ name: 'task_gid', in: 'path' },
		{ name: 'opt_pretty', in: 'query' },
		{ name: 'insert_after', in: 'body' },
		{ name: 'parent', in: 'body' },
	],
}
const getTags: RestOperation = { ...setParent, operationId: 'getTags', path: '/tags', tag: 'Tags', parameters: [] }
const baseline = restCatalogFromOperations('b', [setParent, getTags], '2026-11-19')

const coverage: ParameterCoverage = {
	global: { opt_pretty: 'formatting only' },
	operations: {
		setParentForTask: {
			cli: ['task update'],
			mcp: ['asana_task_update'],
			parameters: {
				task_gid: { status: 'covered', cli: '<gid>', mcp: 'task_gid' },
				insert_after: { status: 'gap', issue: 'https://github.com/cyberuni/cyber-asana/issues/1' },
				parent: { status: 'covered', cli: '--parent', mcp: 'parent_gid' },
			},
		},
	},
}

describe('findWrappedOperations', () => {
	it('finds SDK calls named after an operation, ignoring other method calls', () => {
		const sources = ['const res = await tasksApi.setParentForTask({ data }, gid, {})', 'gateway.getTask(gid)']
		expect(findWrappedOperations(sources, baseline)).toEqual(['setParentForTask'])
	})
})

describe('checkParameterCoverage', () => {
	it('accepts complete coverage', () => {
		expect(checkParameterCoverage(baseline, coverage, ['setParentForTask'])).toEqual([])
	})

	it('reports a wrapped operation with no entry', () => {
		expect(checkParameterCoverage(baseline, coverage, ['setParentForTask', 'getTags'])).toEqual([
			'getTags: wrapped by cyber-asana but has no entry in parameter-coverage.json',
		])
	})

	it('reports a parameter the API gained that the entry does not classify', () => {
		const grown = restCatalogFromOperations('b', [
			{ ...setParent, parameters: [...setParent.parameters!, { name: 'insert_before', in: 'body' }] },
		])
		expect(checkParameterCoverage(grown, coverage, ['setParentForTask'])).toEqual([
			'setParentForTask: body parameter insert_before is not classified',
		])
	})

	it('reports entries for parameters or operations the API no longer has', () => {
		const shrunk = restCatalogFromOperations('b', [
			{ ...setParent, parameters: setParent.parameters!.filter((p) => p.name !== 'parent') },
		])
		expect(checkParameterCoverage(shrunk, coverage, ['setParentForTask'])).toEqual([
			'setParentForTask: parameter parent is classified but the API no longer has it',
		])
		expect(checkParameterCoverage(restCatalogFromOperations('b', []), coverage, [])).toEqual([
			'setParentForTask: classified but the API no longer has this operation',
		])
	})

	it('needs a reason for a skip, an issue for a gap, and both names for a covered parameter', () => {
		const bad: ParameterCoverage = {
			global: coverage.global,
			operations: {
				setParentForTask: {
					...coverage.operations.setParentForTask!,
					parameters: {
						task_gid: { status: 'covered', cli: '<gid>' } as never,
						insert_after: { status: 'gap' } as never,
						parent: { status: 'skipped' } as never,
					},
				},
			},
		}
		expect(checkParameterCoverage(baseline, bad, ['setParentForTask'])).toEqual([
			'setParentForTask: task_gid is covered but names no MCP field',
			'setParentForTask: insert_after is a gap with no issue link',
			'setParentForTask: parent is skipped with no reason',
		])
	})
})

describe('renderParameterReport', () => {
	it('lists each parameter with its CLI and MCP status, gaps first', () => {
		const report = renderParameterReport(baseline, coverage)
		expect(report).toContain(
			'| `setParentForTask` | `insert_after` | body | — | — | ❌ [#1](https://github.com/cyberuni/cyber-asana/issues/1) |',
		)
		expect(report).toContain('| `setParentForTask` | `parent` | body | `--parent` | `parent_gid` | ✅ |')
		expect(report).toContain('`opt_pretty`')
		expect(report.indexOf('## Gaps')).toBeLessThan(report.indexOf('## Tasks'))
	})

	it('lists each discrepancy between the API and its spec, with the probe date and the error', () => {
		const report = renderParameterReport(baseline, {
			...coverage,
			discrepancies: [
				{
					operation: 'setParentForTask',
					parameters: ['insert_after', 'parent'],
					spec: 'The spec says they combine.',
					observed: 'The live API refuses both together.',
					probed: '2026-11-19',
					error: 'Must specify one',
				},
			],
		})
		const section = report.indexOf('## Where the API disagrees with its spec')
		expect(section).toBeGreaterThan(-1)
		expect(section).toBeLessThan(report.indexOf('## Gaps'))
		expect(report).toContain(
			'| `setParentForTask` | `insert_after`, `parent` | The spec says they combine. | The live API refuses both together. Probed 2026-11-19: `Must specify one` |',
		)
	})

	it('says so when the API matches its spec everywhere it was probed', () => {
		const report = renderParameterReport(baseline, coverage)
		expect(report).toContain('## Where the API disagrees with its spec\n\nNone found.')
	})
})

describe('checkParameterCoverage discrepancies', () => {
	it('reports a discrepancy naming an operation or parameter the coverage does not classify', () => {
		const bad: ParameterCoverage = {
			...coverage,
			discrepancies: [
				{ operation: 'getTags', parameters: [], spec: 's', observed: 'o', probed: '2026-11-19', error: 'e' },
				{
					operation: 'setParentForTask',
					parameters: ['nope'],
					spec: 's',
					observed: 'o',
					probed: '2026-11-19',
					error: 'e',
				},
			],
		}
		expect(checkParameterCoverage(baseline, bad, ['setParentForTask'])).toEqual([
			'discrepancy on getTags: the operation has no entry in parameter-coverage.json',
			'discrepancy on setParentForTask: parameter nope is not classified',
		])
	})
})
