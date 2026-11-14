import { isDirectRun } from './cli.js'
import { assertRestOperationCount, parseRestOperations } from './parse-rest-operations.js'
import { asanaOpenApiUrl, restBaselinePath } from './paths.js'
import { restCatalogFromOperations, writeRestCatalog } from './rest-catalog.js'

async function main() {
	const args = process.argv.slice(2)
	const json = args.includes('--json')
	const write = args.includes('--write')

	const response = await fetch(asanaOpenApiUrl, { headers: { 'User-Agent': 'cyber-asana-gap-analysis' } })
	if (!response.ok) {
		throw new Error(`Failed to fetch ${asanaOpenApiUrl}: ${response.status} ${response.statusText}`)
	}

	const operations = parseRestOperations(await response.text())
	assertRestOperationCount(operations)
	const catalog = restCatalogFromOperations(asanaOpenApiUrl, operations)

	if (write) {
		await writeRestCatalog(restBaselinePath, catalog)
		console.log(`Wrote ${restBaselinePath} (${catalog.operation_count} operations)`)
		return
	}

	if (json) {
		process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`)
		return
	}

	console.log(`Fetched ${catalog.operation_count} REST operations from ${asanaOpenApiUrl}`)
	for (const o of catalog.operations) console.log(`  ${o.operationId}`)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
