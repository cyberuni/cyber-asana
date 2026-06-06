import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { cyberAsanaSrcDir } from './paths.js'

const STATIC_TOOL_REGEX = /server\.tool\s*\(\s*['"`](asana_[a-z0-9_]+)['"`]/g

const TEMPLATE_SUFFIX_REGEX = /asana_\$\{prefix\}_([a-z0-9_]+)/g

const STORY_PREFIXES = ['story', 'comment'] as const

export async function extractCyberTools(): Promise<string[]> {
	const srcDir = cyberAsanaSrcDir
	const files = await listMcpFiles(srcDir)
	const tools = new Set<string>()

	for (const file of files) {
		const content = await readFile(file, 'utf8')
		for (const match of content.matchAll(STATIC_TOOL_REGEX)) {
			tools.add(match[1])
		}
		for (const match of content.matchAll(TEMPLATE_SUFFIX_REGEX)) {
			const suffix = match[1]
			for (const prefix of STORY_PREFIXES) {
				tools.add(`asana_${prefix}_${suffix}`)
			}
		}
	}

	return [...tools].sort()
}

async function listMcpFiles(srcDir: string): Promise<string[]> {
	const entries = await readdir(srcDir, { withFileTypes: true })
	const files: string[] = []

	for (const entry of entries) {
		const fullPath = path.join(srcDir, entry.name)
		if (entry.isDirectory()) {
			const nested = path.join(fullPath, 'mcp.ts')
			try {
				await readFile(nested)
				files.push(nested)
			} catch {
				// domain folder without mcp.ts
			}
			continue
		}
		if (entry.name === 'url-mcp.ts') {
			files.push(fullPath)
		}
	}

	return files.sort()
}
