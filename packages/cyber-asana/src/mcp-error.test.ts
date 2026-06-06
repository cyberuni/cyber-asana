import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it, vi } from 'vitest'
import { formatMcpToolError, withMcpErrorHandling } from './mcp-error.js'

function textContent(result: CallToolResult): string {
	const block = result.content[0]
	if (block?.type !== 'text') {
		throw new Error('Expected text content block')
	}
	return block.text
}

describe('formatMcpToolError', () => {
	it('returns structured JSON for Asana API errors', () => {
		const error = {
			response: {
				status: 404,
				body: {
					errors: [{ message: 'Not Found', help: 'For more information on API status codes' }],
				},
			},
		}

		const result = formatMcpToolError(error)

		expect(result.isError).toBe(true)
		expect(result.content).toHaveLength(1)
		expect(JSON.parse(textContent(result))).toEqual({
			ok: false,
			error: {
				kind: 'asana_api',
				message: 'Not Found',
				status: 404,
				errors: [{ message: 'Not Found', help: 'For more information on API status codes' }],
			},
		})
	})

	it('returns structured JSON for missing token config errors', () => {
		const result = formatMcpToolError(new Error('ASANA_TOKEN environment variable is not set'))

		expect(result.isError).toBe(true)
		expect(JSON.parse(textContent(result))).toMatchObject({
			ok: false,
			error: {
				kind: 'config',
				message: 'ASANA_TOKEN environment variable is not set',
				hint: expect.stringContaining('ASANA_TOKEN'),
			},
		})
	})

	it('returns structured JSON for generic errors', () => {
		const result = formatMcpToolError(new Error('Something went wrong'))

		expect(result.isError).toBe(true)
		expect(JSON.parse(textContent(result))).toEqual({
			ok: false,
			error: {
				kind: 'internal',
				message: 'Something went wrong',
			},
		})
	})
})

describe('withMcpErrorHandling', () => {
	it('wraps tool handlers and returns structured errors instead of throwing', async () => {
		const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
		const server = {
			tool(name: string, ...rest: unknown[]) {
				const callback = rest.at(-1)
				if (typeof callback === 'function') {
					handlers.set(name, callback as (...args: unknown[]) => Promise<unknown>)
				}
			},
		} as unknown as McpServer

		withMcpErrorHandling(server)
		server.tool('asana_workspace_get', 'Get workspace', {}, async () => {
			throw {
				response: {
					status: 403,
					body: { errors: [{ message: 'Forbidden' }] },
				},
			}
		})

		const handler = handlers.get('asana_workspace_get')
		expect(handler).toBeDefined()

		const result = await handler?.({ workspace_gid: 'ws1' })

		expect(result).toMatchObject({
			isError: true,
			content: [{ type: 'text', text: expect.any(String) }],
		})
		expect(JSON.parse((result as { content: { text: string }[] }).content[0].text)).toMatchObject({
			ok: false,
			error: {
				kind: 'asana_api',
				message: 'Forbidden',
				status: 403,
			},
		})
	})

	it('passes through successful tool results unchanged', async () => {
		const success = { content: [{ type: 'text' as const, text: '{"gid":"1"}' }] }
		const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
		const originalTool = vi.fn((name: string, ...rest: unknown[]) => {
			const callback = rest.at(-1)
			if (typeof callback === 'function') {
				handlers.set(name, callback as (...args: unknown[]) => Promise<unknown>)
			}
		})
		const server = { tool: originalTool } as unknown as McpServer

		withMcpErrorHandling(server)
		server.tool('asana_workspace_get', 'Get workspace', {}, async () => success)

		const result = await handlers.get('asana_workspace_get')?.({ workspace_gid: 'ws1' })
		expect(result).toBe(success)
	})
})
