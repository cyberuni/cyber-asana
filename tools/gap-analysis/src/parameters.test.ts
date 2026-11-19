import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { checkParameterCoverage, renderParameterReport } from './parameter-coverage.js'
import { currentParameterState } from './parameters.js'
import { parameterReportPath } from './paths.js'

// The drift guard: refreshing the baseline (`fetch-rest -- --write`) after Asana adds a parameter to
// an operation cyber-asana wraps, or wrapping a new operation, fails here until it is classified.
describe('committed parameter coverage', () => {
	it('classifies every parameter of every wrapped operation', async () => {
		const { catalog, coverage, wrapped } = await currentParameterState()
		expect(checkParameterCoverage(catalog, coverage, wrapped)).toEqual([])
	})

	it('matches the published audit page', async () => {
		const { catalog, coverage } = await currentParameterState()
		expect(await readFile(parameterReportPath, 'utf8')).toBe(renderParameterReport(catalog, coverage))
	})
})
