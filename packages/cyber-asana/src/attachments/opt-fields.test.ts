import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAttachmentApi } from './api.js'
import { attachmentCommand } from './cli.js'
import { createAsanaAttachmentGateway } from './gateway.js'
import { registerAttachmentTools } from './mcp.js'

const read = { optFields: 'name,gid' }

describe('attachment create accepts opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends opt_fields beside the multipart fields', async () => {
		const create = vi
			.spyOn(Asana.AttachmentsApi.prototype, 'createAttachmentForObject')
			.mockResolvedValue({ data: { gid: 'a1' } } as never)
		const gateway = createAsanaAttachmentGateway({} as Asana.ApiClient)

		await gateway.createAttachment(
			{ parent: 't1', name: 'n', url: 'https://x.test', resourceSubtype: 'external' },
			read,
		)

		expect(create.mock.calls[0]?.[0]).toMatchObject({ parent: 't1', url: 'https://x.test', opt_fields: 'name,gid' })
	})

	it('api forwards the options to the gateway', async () => {
		const gateway = { createAttachment: vi.fn().mockResolvedValue({}) }
		await createAttachmentApi(gateway as never).createAttachment('t1', { url: 'https://x.test' }, read)

		expect(gateway.createAttachment).toHaveBeenCalledWith(expect.objectContaining({ parent: 't1' }), read)
	})

	it('CLI --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createAttachment: vi.fn().mockResolvedValue({ gid: 'a1' }) }

		await new Command()
			.addCommand(attachmentCommand(api as never))
			.parseAsync(
				[
					'node',
					'test',
					'attachment',
					'create',
					'--url',
					'https://x.test',
					'--parent-gid',
					't1',
					'--opt-fields',
					'name,gid',
				],
				{ from: 'node' },
			)

		expect(api.createAttachment).toHaveBeenCalledWith('t1', expect.anything(), read)
	})

	it('MCP opt_fields reaches the api method', async () => {
		const handlers = new Map<string, (p: never) => Promise<unknown>>()
		const server = { tool: (name: string, _d: string, _s: unknown, h: never) => handlers.set(name, h) }
		const api = { createAttachment: vi.fn().mockResolvedValue({}) }
		registerAttachmentTools(server as never, api as never)

		await handlers.get('asana_attachment_create')?.({
			parent_gid: 't1',
			url: 'https://x.test',
			opt_fields: 'name,gid',
		} as never)

		expect(api.createAttachment).toHaveBeenCalledWith('t1', expect.anything(), read)
	})
})
