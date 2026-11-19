import { readFile, writeFile } from 'node:fs/promises'
import { isDirectRun } from './cli.js'
import {
	checkParameterCoverage,
	findWrappedOperations,
	type ParameterCoverage,
	readSourceFiles,
	renderParameterReport,
} from './parameter-coverage.js'
import { cyberAsanaSrcDir, parameterCoveragePath, parameterReportPath, restBaselinePath } from './paths.js'
import { readRestCatalog } from './rest-catalog.js'

async function loadParameterCoverage(): Promise<ParameterCoverage> {
	return JSON.parse(await readFile(parameterCoveragePath, 'utf8')) as ParameterCoverage
}

export async function currentParameterState() {
	const catalog = await readRestCatalog(restBaselinePath)
	const coverage = await loadParameterCoverage()
	const wrapped = findWrappedOperations(await readSourceFiles(cyberAsanaSrcDir), catalog)
	return { catalog, coverage, wrapped }
}

/** Add an entry, every parameter marked `todo`, for each wrapped operation that has none. */
function addSkeletons(state: Awaited<ReturnType<typeof currentParameterState>>): number {
	let added = 0
	for (const operationId of state.wrapped) {
		if (state.coverage.operations[operationId]) continue
		const operation = state.catalog.operations.find((o) => o.operationId === operationId)!
		state.coverage.operations[operationId] = {
			cli: [],
			mcp: [],
			parameters: Object.fromEntries(
				(operation.parameters ?? [])
					.filter((p) => !(p.name in state.coverage.global))
					.map((p) => [p.name, { status: 'todo' } as never]),
			),
		}
		added++
	}
	state.coverage.operations = Object.fromEntries(
		Object.entries(state.coverage.operations).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	)
	return added
}

async function main() {
	const args = process.argv.slice(2)
	const state = await currentParameterState()

	if (args.includes('--skeleton')) {
		const added = addSkeletons(state)
		await writeFile(parameterCoveragePath, `${JSON.stringify(state.coverage, null, '\t')}\n`, 'utf8')
		console.log(`Added ${added} operation entries to ${parameterCoveragePath}`)
		return
	}

	const problems = checkParameterCoverage(state.catalog, state.coverage, state.wrapped)
	if (problems.length > 0) {
		console.error(`parameter-coverage.json has ${problems.length} problems:`)
		for (const problem of problems) console.error(`  ${problem}`)
		process.exit(1)
	}

	const report = renderParameterReport(state.catalog, state.coverage)
	if (args.includes('--check')) {
		if ((await readFile(parameterReportPath, 'utf8').catch(() => '')) !== report) {
			console.error(`${parameterReportPath} is out of date.`)
			console.error('Run: pnpm --filter @cyberuni/gap-analysis run parameters')
			process.exit(1)
		}
		console.log(`Parameter coverage OK (${state.wrapped.length} operations)`)
		return
	}

	await writeFile(parameterReportPath, report, 'utf8')
	console.log(`Wrote ${parameterReportPath}`)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
