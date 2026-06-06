import { readCatalog } from './catalog-io.js'
import { isDirectRun } from './cli.js'
import { overlapMap } from './overlap-map.js'
import { cyberCatalogPath, officialBaselinePath } from './paths.js'
import type { GapReport, OverlapReportEntry } from './types.js'

export function buildGapReport(officialTools: string[], cyberTools: string[]): GapReport {
	const officialSet = new Set(officialTools)
	const cyberSet = new Set(cyberTools)
	const pairedOfficial = new Set<string>()
	const pairedCyber = new Set<string>()
	const overlap: OverlapReportEntry[] = []

	for (const entry of overlapMap) {
		if (!officialSet.has(entry.official) || !cyberSet.has(entry.cyber)) continue
		pairedOfficial.add(entry.official)
		pairedCyber.add(entry.cyber)
		overlap.push(entry)
	}

	const officialOnly = officialTools.filter((tool) => !pairedOfficial.has(tool)).sort()
	const cyberOnly = cyberTools.filter((tool) => !pairedCyber.has(tool)).sort()
	const unmappedOfficial = overlapMap
		.filter((entry) => officialSet.has(entry.official) && !cyberSet.has(entry.cyber))
		.map((entry) => entry.official)
		.sort()
	const unmappedCyber = overlapMap
		.filter((entry) => cyberSet.has(entry.cyber) && !officialSet.has(entry.official))
		.map((entry) => entry.cyber)
		.sort()

	return {
		generated_at: new Date().toISOString(),
		official_source: officialBaselinePath,
		cyber_source: cyberCatalogPath,
		official_count: officialTools.length,
		cyber_count: cyberTools.length,
		official_only: officialOnly,
		cyber_only: cyberOnly,
		overlap,
		unmapped_official: unmappedOfficial,
		unmapped_cyber: unmappedCyber,
	}
}

function printHumanReport(report: GapReport): void {
	console.log('MCP gap report')
	console.log(`  Official tools: ${report.official_count}`)
	console.log(`  cyber-asana tools: ${report.cyber_count}`)
	console.log(`  Overlap pairs: ${report.overlap.length}`)
	console.log(`  Official-only: ${report.official_only.length}`)
	console.log(`  cyber-asana-only: ${report.cyber_only.length}`)

	if (report.official_only.length > 0) {
		console.log('\nOfficial-only:')
		for (const tool of report.official_only) console.log(`  ${tool}`)
	}

	if (report.cyber_only.length > 0) {
		console.log('\ncyber-asana-only:')
		for (const tool of report.cyber_only) console.log(`  ${tool}`)
	}

	if (report.overlap.length > 0) {
		console.log('\nOverlap:')
		for (const entry of report.overlap) {
			console.log(`  ${entry.official} ↔ ${entry.cyber} (${entry.confidence})`)
		}
	}
}

async function main() {
	const json = process.argv.includes('--json')
	const official = await readCatalog(officialBaselinePath)
	const cyber = await readCatalog(cyberCatalogPath)
	const report = buildGapReport(official.tools, cyber.tools)

	if (json) {
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
		return
	}

	printHumanReport(report)
}

if (isDirectRun(import.meta.url)) {
	void main().catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
}
