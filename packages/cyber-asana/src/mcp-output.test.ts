import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'
import { mcpOutputFormat, reencodeToolResult, withMcpOutputFormat } from './mcp-output.js'

function firstText(result: CallToolResult): string {
	const part = result.content[0]
	if (part.type !== 'text') throw new Error('expected text content')
	return part.text
}

describe('mcpOutputFormat', () => {
	it('defaults to json', () => {
		expect(mcpOutputFormat({})).toBe('json')
	})

	it('returns toon when CYBER_ASANA_MCP_FORMAT=toon', () => {
		expect(mcpOutputFormat({ CYBER_ASANA_MCP_FORMAT: 'toon' })).toBe('toon')
		expect(mcpOutputFormat({ CYBER_ASANA_MCP_FORMAT: 'TOON' })).toBe('toon')
	})
})

describe('reencodeToolResult', () => {
	const jsonResult = {
		content: [{ type: 'text' as const, text: JSON.stringify({ gid: '1', name: 'A' }) }],
	}

	it('leaves results untouched in json mode', () => {
		expect(reencodeToolResult(jsonResult, 'json')).toBe(jsonResult)
	})

	it('re-encodes JSON text content as TOON', () => {
		const out = reencodeToolResult(jsonResult, 'toon')
		expect(firstText(out)).toBe('gid: 1\nname: A')
	})

	it('leaves non-JSON text content untouched', () => {
		const plain = { content: [{ type: 'text' as const, text: 'Deleted task 1' }] }
		expect(firstText(reencodeToolResult(plain, 'toon'))).toBe('Deleted task 1')
	})

	it('re-encodes error results too', () => {
		const errorResult = {
			isError: true,
			content: [{ type: 'text' as const, text: JSON.stringify({ ok: false, error: { message: 'boom' } }) }],
		}
		const out = reencodeToolResult(errorResult, 'toon')
		expect(firstText(out)).toContain('ok: false')
		expect(out.isError).toBe(true)
	})
})

describe('withMcpOutputFormat', () => {
	it('re-encodes a registered tool result as TOON when enabled', async () => {
		const handlers = new Map<string, (params: unknown) => Promise<CallToolResult>>()
		const fake = {
			tool(name: string, _desc: string, _schema: unknown, handler: (params: unknown) => Promise<CallToolResult>) {
				handlers.set(name, handler)
			},
		}
		const server = withMcpOutputFormat(fake as unknown as McpServer, { CYBER_ASANA_MCP_FORMAT: 'toon' })
		server.tool('t', 'desc', {}, async () => ({
			content: [{ type: 'text', text: JSON.stringify({ gid: '1' }) }],
		}))

		const result = await handlers.get('t')?.({})
		expect(result && firstText(result)).toBe('gid: 1')
	})

	it('leaves results as JSON by default', async () => {
		const handlers = new Map<string, (params: unknown) => Promise<CallToolResult>>()
		const fake = {
			tool(name: string, _desc: string, _schema: unknown, handler: (params: unknown) => Promise<CallToolResult>) {
				handlers.set(name, handler)
			},
		}
		const server = withMcpOutputFormat(fake as unknown as McpServer, {})
		server.tool('t', 'desc', {}, async () => ({
			content: [{ type: 'text', text: JSON.stringify({ gid: '1' }) }],
		}))

		const result = await handlers.get('t')?.({})
		expect(result && firstText(result)).toBe('{"gid":"1"}')
	})
})
