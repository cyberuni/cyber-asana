import { isDirectRun } from './cli.js'
import { restBaselinePath } from './paths.js'
import { readRestCatalog } from './rest-catalog.js'
import type { AddedRestParameter, RestCatalog, RestDiff, RestOperation } from './rest-types.js'

function addedParameters(before: Map<string, RestOperation>, fetched: RestCatalog): AddedRestParameter[] {
	return fetched.operations.flatMap((operation) => {
		const known = before.get(operation.operationId)?.parameters
		if (!known) return []
		const names = new Set(known.map((p) => `${p.in}:${p.name}`))
		return (operation.parameters ?? [])
			.filter((p) => !names.has(`${p.in}:${p.name}`))
			.map((p) => ({ operationId: operation.operationId, ...p }))
	})
}

export function diffRestCatalogs(baseline: RestCatalog, fetched: RestCatalog): RestDiff {
	const before = new Map(baseline.operations.map((o) => [o.operationId, o]))
	const after = new Map(fetched.operations.map((o) => [o.operationId, o]))
	return {
		added: fetched.operations.filter((o) => !before.has(o.operationId)),
		removed: baseline.operations.filter((o) => !after.has(o.operationId)),
		newly_deprecated: fetched.operations.filter((o) => o.deprecated && before.get(o.operationId)?.deprecated === false),
		added_parameters: addedParameters(before, fetched),
		baseline_path: restBaselinePath,
		fetched_at: fetched.fetched_at,
		operation_count_before: baseline.operation_count,
		operation_count_after: fetched.operation_count,
	}
}

export function isRestDrift(diff: RestDiff): boolean {
	return diff.added.length + diff.removed.length + diff.newly_deprecated.length + diff.added_parameters.length > 0
}

function list(operations: RestOperation[]): string {
	return operations.length > 0
		? operations.map((o) => `- \`${o.operationId}\` (${o.method} ${o.path})`).join('\n')
		: '- _(none)_'
}

export function renderRestIssueBody(diff: RestDiff): string {
	return `# Asana REST API changed

The weekly REST API watch detected a change in the [Asana OpenAPI definition](https://github.com/Asana/openapi/blob/master/defs/asana_oas.yaml).

## Added operations (${diff.added.length})

${list(diff.added)}

## Removed operations (${diff.removed.length})

${list(diff.removed)}

## Newly deprecated operations (${diff.newly_deprecated.length})

${list(diff.newly_deprecated)}

## Added parameters on existing operations (${diff.added_parameters.length})

${
	diff.added_parameters.length > 0
		? diff.added_parameters.map((p) => `- \`${p.operationId}\`: ${p.in} \`${p.name}\``).join('\n')
		: '- _(none)_'
}

## Operation counts

- Baseline: ${diff.operation_count_before}
- Fetched: ${diff.operation_count_after}

## Next steps

- [ ] Check whether the installed \`asana\` SDK (\`packages/cyber-asana/package.json\`) already has the new operations; if not, the change waits on an SDK release, which Renovate raises
- [ ] Run the \`.agents/skills/analyze-asana-api-coverage\` skill
- [ ] Run the \`update-asana-sdk\` skill to wrap what is worth wrapping
- [ ] Refresh the baseline: \`pnpm --filter @cyberuni/gap-analysis run fetch-rest -- --write\`
- [ ] Classify each new parameter of a wrapped operation in \`tools/gap-analysis/data/parameter-coverage.json\` (cover it, skip it with a reason, or file an issue), then \`pnpm --filter @cyberuni/gap-analysis run parameters\`

Compare with committed baseline at \`tools/gap-analysis/data/asana-rest-baseline.json\`.
`
}

async function main() {
	const args = process.argv.slice(2)
	const json = args.includes('--json')
	const issueBody = args.includes('--issue-body')
	const inputPath = args.find((arg) => !arg.startsWith('--'))

	if (!inputPath) {
		console.error('Usage: diff-rest <fetched.json> [--json] [--issue-body]')
		process.exit(2)
	}

	const diff = diffRestCatalogs(await readRestCatalog(restBaselinePath), await readRestCatalog(inputPath))
	const changed = isRestDrift(diff)

	if (issueBody) {
		process.stdout.write(renderRestIssueBody(diff))
		process.exit(changed ? 1 : 0)
	}

	if (json) {
		process.stdout.write(`${JSON.stringify({ ...diff, changed }, null, 2)}\n`)
		process.exit(changed ? 1 : 0)
	}

	if (!changed) {
		console.log('Asana REST API unchanged.')
		process.exit(0)
	}

	console.log('Asana REST API changed.')
	for (const [label, ops, sign] of [
		['Added', diff.added, '+'],
		['Removed', diff.removed, '-'],
		['Newly deprecated', diff.newly_deprecated, '!'],
	] as const) {
		if (ops.length === 0) continue
		console.log(`\n${label}:`)
		for (const o of ops) console.log(`  ${sign} ${o.operationId} (${o.method} ${o.path})`)
	}
	if (diff.added_parameters.length > 0) {
		console.log('\nAdded parameters:')
		for (const p of diff.added_parameters) console.log(`  + ${p.operationId} ${p.in} ${p.name}`)
	}
	process.exit(1)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
