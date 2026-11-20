import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { RestCatalog, RestOperation } from './rest-types.js'

type CoveredParameter = { status: 'covered'; cli: string; mcp: string; note?: string }
type SkippedParameter = { status: 'skipped'; reason: string }
type GapParameter = { status: 'gap'; issue: string; note?: string }
type ParameterStatus = CoveredParameter | SkippedParameter | GapParameter

type OperationCoverage = {
	/** Commands and tools that send this operation. */
	cli: string[]
	mcp: string[]
	parameters: Record<string, ParameterStatus>
}

/** A place where the live API behaves otherwise than its OpenAPI definition says, found by a probe. */
type Discrepancy = {
	operation: string
	parameters: string[]
	/** What the OpenAPI definition says. */
	spec: string
	/** What the live API did. */
	observed: string
	/** Date of the probe, YYYY-MM-DD. */
	probed: string
	/** The error the live API returned, verbatim. */
	error: string
}

export type ParameterCoverage = {
	/** Parameters skipped on every operation, with the reason. */
	global: Record<string, string>
	operations: Record<string, OperationCoverage>
	discrepancies?: Discrepancy[]
}

const SDK_CALL = /\b\w+Api\.(\w+)\s*\(/g

/** Operation IDs called through an Asana SDK API instance (`tasksApi.setParentForTask(...)`). */
export function findWrappedOperations(sources: string[], catalog: RestCatalog): string[] {
	const known = new Set(catalog.operations.map((o) => o.operationId))
	const found = new Set<string>()
	for (const source of sources) {
		for (const match of source.matchAll(SDK_CALL)) if (known.has(match[1]!)) found.add(match[1]!)
	}
	return [...found].sort()
}

export async function readSourceFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true })
	const files = entries
		.filter((e) => e.isFile() && e.name.endsWith('.ts') && !/\.(test|acceptance|system)\.ts$/.test(e.name))
		.map((e) => path.join(e.parentPath, e.name))
	return Promise.all(files.map((file) => readFile(file, 'utf8')))
}

function checkStatus(operationId: string, name: string, status: ParameterStatus): string | undefined {
	if (status.status === 'covered') {
		if (!status.cli) return `${operationId}: ${name} is covered but names no CLI flag`
		if (!status.mcp) return `${operationId}: ${name} is covered but names no MCP field`
	} else if (status.status === 'skipped') {
		if (!status.reason) return `${operationId}: ${name} is skipped with no reason`
	} else if (status.status === 'gap') {
		if (!status.issue) return `${operationId}: ${name} is a gap with no issue link`
	} else {
		return `${operationId}: ${name} has unknown status ${(status as { status: string }).status}`
	}
	return undefined
}

/**
 * Problems with the coverage file: a wrapped operation with no entry, a parameter the API has that
 * an entry does not classify, an entry the API no longer backs, or a status missing what it needs.
 */
export function checkParameterCoverage(catalog: RestCatalog, coverage: ParameterCoverage, wrapped: string[]): string[] {
	const problems: string[] = []
	const operations = new Map(catalog.operations.map((o) => [o.operationId, o]))
	for (const operationId of wrapped) {
		if (!coverage.operations[operationId]) {
			problems.push(`${operationId}: wrapped by cyber-asana but has no entry in parameter-coverage.json`)
		}
	}
	for (const [operationId, entry] of Object.entries(coverage.operations)) {
		const operation = operations.get(operationId)
		if (!operation) {
			problems.push(`${operationId}: classified but the API no longer has this operation`)
			continue
		}
		const apiParameters = (operation.parameters ?? []).filter((p) => !(p.name in coverage.global))
		for (const parameter of apiParameters) {
			if (!entry.parameters[parameter.name]) {
				problems.push(`${operationId}: ${parameter.in} parameter ${parameter.name} is not classified`)
			}
		}
		const names = new Set(apiParameters.map((p) => p.name))
		for (const [name, status] of Object.entries(entry.parameters)) {
			if (!names.has(name)) {
				problems.push(`${operationId}: parameter ${name} is classified but the API no longer has it`)
				continue
			}
			const problem = checkStatus(operationId, name, status)
			if (problem) problems.push(problem)
		}
	}
	for (const discrepancy of coverage.discrepancies ?? []) {
		const entry = coverage.operations[discrepancy.operation]
		if (!entry) {
			problems.push(`discrepancy on ${discrepancy.operation}: the operation has no entry in parameter-coverage.json`)
			continue
		}
		for (const name of discrepancy.parameters) {
			if (!entry.parameters[name]) {
				problems.push(`discrepancy on ${discrepancy.operation}: parameter ${name} is not classified`)
			}
		}
	}
	return problems
}

function issueLink(url: string) {
	const number = url.match(/\/(\d+)$/)?.[1]
	return number ? `[#${number}](${url})` : `[issue](${url})`
}

const code = (value: string) => `\`${value.replaceAll('|', '\\|')}\``

function row(operation: RestOperation, name: string, location: string, status: ParameterStatus) {
	const cells =
		status.status === 'covered'
			? [code(status.cli), code(status.mcp), status.note ? `✅ ${status.note}` : '✅']
			: status.status === 'skipped'
				? ['—', '—', `➖ ${status.reason}`]
				: ['—', '—', `❌ ${issueLink(status.issue)}${status.note ? ` ${status.note}` : ''}`]
	return `| ${code(operation.operationId)} | ${code(name)} | ${location} | ${cells.join(' | ')} |`
}

function discrepancyLines(discrepancies: Discrepancy[]) {
	if (discrepancies.length === 0) return ['None found.']
	return [
		'Each row is a live probe that contradicts the OpenAPI definition. cyber-asana follows the live API.',
		'',
		'| Endpoint | Parameters | The spec says | The live API does |',
		'| --- | --- | --- | --- |',
		...discrepancies.map(
			(d) =>
				`| ${code(d.operation)} | ${d.parameters.map(code).join(', ')} | ${d.spec} | ${d.observed} Probed ${d.probed}: ${code(d.error)} |`,
		),
	]
}

const HEADER = '| Endpoint | Parameter | In | CLI | MCP | Status |\n| --- | --- | --- | --- | --- | --- |'

/** The audit page: gaps first, then every classified parameter grouped by Asana resource. */
export function renderParameterReport(catalog: RestCatalog, coverage: ParameterCoverage): string {
	const operations = catalog.operations.filter((o) => coverage.operations[o.operationId])
	const rows = operations.flatMap((operation) => {
		const entry = coverage.operations[operation.operationId]!
		return (operation.parameters ?? [])
			.filter((p) => entry.parameters[p.name])
			.map((p) => ({ operation, parameter: p, status: entry.parameters[p.name]! }))
	})
	const count = (status: ParameterStatus['status']) => rows.filter((r) => r.status.status === status).length
	const gaps = rows.filter((r) => r.status.status === 'gap')
	const tags = [...new Set(operations.map((o) => o.tag))].sort()

	const lines = [
		'---',
		'title: Parameter Coverage',
		'description: Every request parameter of each Asana API operation cyber-asana wraps, and the CLI flag and MCP field that send it.',
		'---',
		'',
		'<!-- Generated by `pnpm --filter @cyberuni/gap-analysis run parameters`; edit tools/gap-analysis/data/parameter-coverage.json instead. -->',
		'',
		`For each of the **${operations.length}** Asana REST operations cyber-asana wraps, this page lists`,
		'every path, query, and top-level body parameter in the',
		`[Asana OpenAPI definition](${catalog.source}) (fetched ${catalog.fetched_at}) and how cyber-asana sends it.`,
		`Of **${rows.length}** parameters, **${count('covered')}** are covered, **${count('skipped')}** are skipped on purpose, and **${count('gap')}** are open gaps.`,
		'Header parameters are left out: an API client sets them once, not per command.',
		'',
		'| Status | Meaning |',
		'| --- | --- |',
		'| ✅ | Both the CLI and MCP send it |',
		'| ➖ | Skipped on purpose, with the reason |',
		'| ❌ | Not exposed yet; the linked issue tracks it |',
		'',
		'Skipped on every operation:',
		'',
		...Object.entries(coverage.global).map(([name, reason]) => `- ${code(name)}: ${reason}`),
		'',
		'`pnpm --filter @cyberuni/gap-analysis test` fails when the committed API baseline has a parameter',
		'this table does not classify, so refreshing the baseline after Asana adds one surfaces it here.',
		'',
		'## Where the API disagrees with its spec',
		'',
		...discrepancyLines(coverage.discrepancies ?? []),
		'',
		'## Gaps',
		'',
		...(gaps.length > 0
			? [HEADER, ...gaps.map((g) => row(g.operation, g.parameter.name, g.parameter.in, g.status))]
			: ['None.']),
		'',
	]
	for (const tag of tags) {
		lines.push(`## ${tag}`, '', HEADER)
		for (const r of rows.filter((r) => r.operation.tag === tag)) {
			lines.push(row(r.operation, r.parameter.name, r.parameter.in, r.status))
		}
		lines.push('')
	}
	return lines.join('\n')
}
