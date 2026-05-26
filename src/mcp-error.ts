import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

type AsanaApiErrorDetail = {
	message: string
	help?: string
	phrase?: string
}

export type McpToolErrorBody = {
	ok: false
	error: {
		kind: 'asana_api' | 'config' | 'internal'
		message: string
		status?: number
		errors?: AsanaApiErrorDetail[]
		hint?: string
	}
}

type AsanaResponseError = {
	response?: {
		status?: number
		body?: {
			errors?: AsanaApiErrorDetail[]
		}
	}
}

function asAsanaResponseError(error: unknown): AsanaResponseError | undefined {
	if (!error || typeof error !== 'object' || !('response' in error)) return undefined
	return error as AsanaResponseError
}

function normalizeAsanaErrors(errors: unknown[] | undefined): AsanaApiErrorDetail[] | undefined {
	if (!errors?.length) return undefined
	return errors.map((entry) => {
		if (entry && typeof entry === 'object' && 'message' in entry) {
			const detail = entry as AsanaApiErrorDetail
			return {
				message: String(detail.message),
				...(detail.help !== undefined && { help: String(detail.help) }),
				...(detail.phrase !== undefined && { phrase: String(detail.phrase) }),
			}
		}
		return { message: JSON.stringify(entry) }
	})
}

export function buildMcpToolErrorBody(error: unknown): McpToolErrorBody {
	const asanaError = asAsanaResponseError(error)
	const asanaErrors = normalizeAsanaErrors(asanaError?.response?.body?.errors)
	if (asanaErrors?.length) {
		return {
			ok: false,
			error: {
				kind: 'asana_api',
				message: asanaErrors.map((entry) => entry.message).join('; '),
				...(asanaError?.response?.status !== undefined && { status: asanaError.response.status }),
				errors: asanaErrors,
			},
		}
	}

	const message = error instanceof Error ? error.message : String(error)
	if (message.includes('ASANA_TOKEN')) {
		return {
			ok: false,
			error: {
				kind: 'config',
				message,
				hint: 'Set ASANA_ACCESS_TOKEN in the MCP server environment (preferred; ASANA_TOKEN is deprecated) or pass a token when starting the server.',
			},
		}
	}

	return {
		ok: false,
		error: {
			kind: 'internal',
			message,
		},
	}
}

export function formatMcpToolError(error: unknown): CallToolResult {
	return {
		isError: true,
		content: [{ type: 'text', text: JSON.stringify(buildMcpToolErrorBody(error)) }],
	}
}

function wrapToolCallback<T extends (...args: never[]) => unknown>(callback: T): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await callback(...args)
		} catch (error) {
			return formatMcpToolError(error)
		}
	}) as T
}

export function withMcpErrorHandling(server: McpServer): McpServer {
	const originalTool = server.tool.bind(server)
	server.tool = ((name: string, ...rest: unknown[]) => {
		const callback = rest.at(-1)
		if (typeof callback === 'function') {
			rest[rest.length - 1] = wrapToolCallback(callback as (...args: never[]) => unknown)
		}
		return originalTool(name, ...(rest as Parameters<typeof originalTool> extends [string, ...infer R] ? R : never))
	}) as typeof server.tool
	return server
}
