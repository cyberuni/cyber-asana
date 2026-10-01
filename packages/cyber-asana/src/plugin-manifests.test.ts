import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The plugin ships the CLI and skills only. The MCP server is opt-in (the `init-asana` skill
 * writes it into the client's own config on request), so no manifest may start it on install.
 */

const packageRoot = path.resolve(import.meta.dirname, '..')

const MANIFESTS = [
	'plugin.json',
	'.claude-plugin/plugin.json',
	'.cursor-plugin/plugin.json',
	'.codex-plugin/plugin.json',
]

function readJson(file: string): Record<string, unknown> {
	return JSON.parse(readFileSync(path.join(packageRoot, file), 'utf8')) as Record<string, unknown>
}

describe('the shipped plugin', () => {
	it.each(MANIFESTS)('%s declares no MCP server', (file) => {
		expect(readJson(file)).not.toHaveProperty('mcpServers')
	})

	it('publishes no MCP server config file', () => {
		const { files } = readJson('package.json') as { files: string[] }
		expect(files).not.toContain('mcp.json')
		expect(files).not.toContain('.mcp.json')
	})
})
