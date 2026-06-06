import { catalogFromTools, catalogsEqual, readCatalog, writeCatalog } from './catalog-io.js'
import { isDirectRun } from './cli.js'
import { extractCyberTools } from './extract-cyber-tools.js'
import { cyberCatalogPath } from './paths.js'

async function main() {
	const check = process.argv.includes('--check')
	const tools = await extractCyberTools()
	const catalog = catalogFromTools('src/**/mcp.ts', tools)

	if (check) {
		const committed = await readCatalog(cyberCatalogPath)
		if (!catalogsEqual(catalog, committed)) {
			console.error('cyber-asana MCP catalog is out of date.')
			console.error('Run: pnpm gap:catalog')
			process.exit(1)
		}
		console.log(`cyber-asana MCP catalog OK (${catalog.tool_count} tools)`)
		return
	}

	await writeCatalog(cyberCatalogPath, catalog)
	console.log(`Wrote ${cyberCatalogPath} (${catalog.tool_count} tools)`)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
