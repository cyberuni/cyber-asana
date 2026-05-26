import { readFile } from 'node:fs/promises'
import { diffToolLists, readCatalog } from './catalog-io.js'
import { isDirectRun } from './cli.js'
import { officialBaselinePath } from './paths.js'
import type { CatalogDiff, McpCatalog } from './types.js'

export function diffCatalogs(baseline: McpCatalog, fetched: McpCatalog): CatalogDiff {
	const { added, removed, unchanged } = diffToolLists(baseline.tools, fetched.tools)
	return {
		added,
		removed,
		unchanged,
		baseline_path: officialBaselinePath,
		fetched_at: fetched.fetched_at,
		tool_count_before: baseline.tool_count,
		tool_count_after: fetched.tool_count,
	}
}

export function renderIssueBody(diff: CatalogDiff): string {
	const added = diff.added.length > 0 ? diff.added.map((tool) => `- \`${tool}\``).join('\n') : '- _(none)_'
	const removed = diff.removed.length > 0 ? diff.removed.map((tool) => `- \`${tool}\``).join('\n') : '- _(none)_'

	return `# Official Asana MCP catalog changed

The weekly catalog watch detected a change on [MCP Tools Reference](https://developers.asana.com/docs/mcp-tools-reference).

## Added tools (${diff.added.length})

${added}

## Removed tools (${diff.removed.length})

${removed}

## Tool counts

- Baseline: ${diff.tool_count_before}
- Fetched: ${diff.tool_count_after}

## Next steps

- [ ] Run \`.agents/skills/analyze-official-asana-mcp\` locally
- [ ] Run \`pnpm gap:report --json\` and review buckets
- [ ] Update \`src/gap-analysis/overlap-map.ts\` if overlap pairs changed
- [ ] Refresh \`data/official-asana-mcp-baseline.json\` after analysis (\`pnpm gap:fetch-official --write\`)

Compare with committed baseline at \`data/official-asana-mcp-baseline.json\`.
`
}

async function loadFetchedCatalog(path: string): Promise<McpCatalog> {
	const raw = await readFile(path, 'utf8')
	return JSON.parse(raw) as McpCatalog
}

async function main() {
	const args = process.argv.slice(2)
	const json = args.includes('--json')
	const issueBody = args.includes('--issue-body')
	const inputPath = args.find((arg) => !arg.startsWith('--'))

	if (!inputPath) {
		console.error('Usage: gap:diff-official <fetched.json> [--json] [--issue-body]')
		process.exit(2)
	}

	const baseline = await readCatalog(officialBaselinePath)
	const fetched = await loadFetchedCatalog(inputPath)
	const diff = diffCatalogs(baseline, fetched)
	const changed = diff.added.length > 0 || diff.removed.length > 0

	if (issueBody) {
		process.stdout.write(renderIssueBody(diff))
		process.exit(changed ? 1 : 0)
	}

	if (json) {
		process.stdout.write(`${JSON.stringify({ ...diff, changed }, null, 2)}\n`)
		process.exit(changed ? 1 : 0)
	}

	if (!changed) {
		console.log('Official MCP catalog unchanged.')
		process.exit(0)
	}

	console.log('Official MCP catalog changed.')
	if (diff.added.length > 0) {
		console.log('\nAdded:')
		for (const tool of diff.added) console.log(`  + ${tool}`)
	}
	if (diff.removed.length > 0) {
		console.log('\nRemoved:')
		for (const tool of diff.removed) console.log(`  - ${tool}`)
	}
	process.exit(1)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
