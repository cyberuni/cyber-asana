import { describe, expect, it } from 'vitest'
import * as library from './index.js'

const exported = Object.keys(library)

describe('library entry', () => {
	it('exports a standalone function for every domain', () => {
		expect(exported).toEqual(
			expect.arrayContaining([
				'listTasks',
				'getProject',
				'getEvents',
				'listMemberships',
				'triggerRule',
				'listStatuses',
				'listTaskTemplates',
			]),
		)
	})

	it('exports the client, job polling, and URL parsing helpers', () => {
		expect(exported).toEqual(
			expect.arrayContaining(['createClient', 'setTokenOverride', 'waitForJob', 'JobFailedError', 'parseAsanaUrl']),
		)
	})

	it('does not export the Asana SDK gateway adapters', () => {
		expect(exported.filter((name) => /^createAsana\w+Gateway$/.test(name))).toEqual([])
	})

	it('does not export CLI or MCP wiring', () => {
		expect(exported).not.toEqual(
			expect.arrayContaining([expect.stringMatching(/^(registerCliCommands|registerMcpTools|createRuntimeContext)$/)]),
		)
	})

	it('does not export repo or global config internals', () => {
		for (const name of ['loadRepoConfig', 'saveGlobalConfig', 'loadConventions', 'setAmbientToken']) {
			expect(exported).not.toContain(name)
		}
	})
})
