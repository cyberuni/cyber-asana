import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assertRestOperationCount, parseRestOperations } from './parse-rest-operations.js'

const fixture = readFileSync(new URL('./fixtures/asana-oas-snippet.yaml', import.meta.url), 'utf8')

describe('parseRestOperations', () => {
	it('extracts operationId, method, path, tag and deprecated, sorted by operationId', () => {
		expect(parseRestOperations(fixture)).toEqual([
			{ operationId: 'createProject', method: 'POST', path: '/projects', tag: '', deprecated: false },
			{ operationId: 'deleteTask', method: 'DELETE', path: '/tasks/{task_gid}', tag: 'Tasks', deprecated: true },
			{ operationId: 'getProjects', method: 'GET', path: '/projects', tag: 'Projects', deprecated: false },
			{ operationId: 'getTask', method: 'GET', path: '/tasks/{task_gid}', tag: 'Tasks', deprecated: false },
		])
	})

	it('ignores path-level keys that are not HTTP methods', () => {
		expect(parseRestOperations(fixture)).toHaveLength(4)
	})

	it('throws when the document has no paths', () => {
		expect(() => parseRestOperations('openapi: 3.0.0\n')).toThrow(/paths/)
	})
})

describe('assertRestOperationCount', () => {
	it('throws when far fewer operations than expected were parsed', () => {
		expect(() => assertRestOperationCount([])).toThrow(/operations/)
	})
})
