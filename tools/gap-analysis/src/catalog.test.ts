import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { diffToolLists } from './catalog-io.js'
import { extractCyberTools } from './extract-cyber-tools.js'
import { parseOfficialTools } from './parse-official-tools.js'

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

describe('parseOfficialTools', () => {
	it('parses markdown table tool names', async () => {
		const content = await readFile(path.join(fixtureDir, 'mcp-tools-reference-snippet.md'), 'utf8')
		expect(parseOfficialTools(content)).toEqual(['create_task_preview', 'create_tasks', 'get_task', 'search_objects'])
	})

	it('parses HTML table row tool names', async () => {
		const content = await readFile(path.join(fixtureDir, 'mcp-tools-reference-snippet.html'), 'utf8')
		expect(parseOfficialTools(content)).toEqual(['create_tasks', 'get_task', 'search_objects'])
	})
})

describe('extractCyberTools', () => {
	it('extracts registered cyber-asana MCP tools from source', async () => {
		const tools = await extractCyberTools()
		expect(tools).toContain('asana_task_create')
		expect(tools).toContain('asana_url_parse')
		expect(tools).toContain('asana_story_list')
		expect(tools).toContain('asana_comment_create')
		expect(tools).toContain('asana_portfolio_item_list')
		expect(tools.length).toBe(68)
	})
})

describe('diffToolLists', () => {
	it('reports added and removed tools', () => {
		const diff = diffToolLists(['a', 'b'], ['b', 'c'])
		expect(diff.added).toEqual(['c'])
		expect(diff.removed).toEqual(['a'])
		expect(diff.unchanged).toEqual(['b'])
	})
})
