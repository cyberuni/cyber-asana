import { catalogFromTools, writeCatalog } from './catalog-io.js'
import { isDirectRun } from './cli.js'
import { assertOfficialToolCount, parseOfficialTools } from './parse-official-tools.js'
import { officialBaselinePath, officialToolsReferenceUrl } from './paths.js'

async function main() {
	const args = process.argv.slice(2)
	const json = args.includes('--json')
	const write = args.includes('--write')

	const response = await fetch(officialToolsReferenceUrl, {
		headers: { 'User-Agent': 'cyber-asana-gap-analysis' },
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch ${officialToolsReferenceUrl}: ${response.status} ${response.statusText}`)
	}

	const content = await response.text()
	const tools = parseOfficialTools(content)
	assertOfficialToolCount(tools)

	const catalog = catalogFromTools(officialToolsReferenceUrl, tools)

	if (write) {
		await writeCatalog(officialBaselinePath, catalog)
		console.log(`Wrote ${officialBaselinePath} (${catalog.tool_count} tools)`)
		return
	}

	if (json) {
		process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`)
		return
	}

	console.log(`Fetched ${catalog.tool_count} official tools from ${officialToolsReferenceUrl}`)
	for (const tool of catalog.tools) {
		console.log(`  ${tool}`)
	}
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
