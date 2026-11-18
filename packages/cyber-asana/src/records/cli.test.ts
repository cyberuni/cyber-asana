import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecordApi } from './api.js'
import { recordCommand } from './cli.js'

function apiDouble(overrides: Partial<RecordApi> = {}): RecordApi {
	return {
		listRecords: vi.fn().mockResolvedValue([]),
		searchRecords: vi.fn().mockResolvedValue([]),
		getRecord: vi.fn(),
		createRecord: vi.fn(),
		updateRecord: vi.fn(),
		deleteRecord: vi.fn(),
		listRecordStories: vi.fn().mockResolvedValue([]),
		createRecordStory: vi.fn(),
		...overrides,
	} as RecordApi
}

async function run(api: RecordApi, ...args: string[]) {
	const record = recordCommand(api)
	const walk = (cmd: Command) => {
		cmd.exitOverride().configureOutput({ writeErr: () => {} })
		cmd.commands.forEach(walk)
	}
	walk(record)
	const program = new Command().addCommand(record)
	await program.parseAsync(['node', 'test', 'record', ...args], { from: 'node' })
}

describe('records/cli', () => {
	afterEach(() => vi.restoreAllMocks())

	it('record list uses a minimal default field set, a count summary, and next steps', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ listRecords: vi.fn().mockResolvedValue([{ gid: 'r1', name: 'Q3' }]) })

		await run(api, 'list', 't1', '--sort-by', 'created_at', '--modified-since', '2026-11-01T00:00:00Z')

		expect(api.listRecords).toHaveBeenCalledWith(
			't1',
			{ sortBy: 'created_at', modifiedSince: '2026-11-01T00:00:00Z' },
			expect.objectContaining({ optFields: 'gid,name' }),
		)
		const lines = log.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 record(s)')
		expect(lines.some((l) => l.includes('cyber-asana record get <gid>'))).toBe(true)
	})

	it('record list names an empty result and rejects an unsupported sort', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run(apiDouble(), 'list', 't1')
		await expect(run(apiDouble(), 'list', 't1', '--sort-by', 'name')).rejects.toThrow(/created_at/)

		expect(log.mock.calls.map((c) => String(c[0]))).toContain('0 records found')
	})

	it('record search maps its filters and needs the workspace', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble()

		await run(
			api,
			'search',
			'--workspace-gid',
			'ws1',
			'--text',
			'Renewal',
			'--table',
			't1,t2',
			'--sort-by',
			'created_at',
			'--ascending',
			'--limit',
			'20',
		)

		expect(api.searchRecords).toHaveBeenCalledWith(
			'ws1',
			{ text: 'Renewal', tablesAny: ['t1', 't2'], sortBy: 'created_at', sortAscending: true },
			expect.objectContaining({ limit: 20, optFields: 'gid,name' }),
		)
	})

	it('record get forwards --opt-fields', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ getRecord: vi.fn().mockResolvedValue({ gid: 'r1', name: 'Q3' }) })

		await run(api, 'get', 'r1', '--opt-fields', 'custom_fields')

		expect(api.getRecord).toHaveBeenCalledWith('r1', { optFields: 'custom_fields' })
	})

	it('record create parses --field and --fingerprint', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ createRecord: vi.fn().mockResolvedValue({ gid: 'r1', name: 'Q3' }) })

		await run(api, 'create', 'Q3', '--table', 't1', '--field', 'cf1=Acme', '--field', 'cf2=12', '--fingerprint', 'fp-1')

		expect(api.createRecord).toHaveBeenCalledWith('t1', 'Q3', {
			customFields: { cf1: 'Acme', cf2: '12' },
			uniqueFingerprint: 'fp-1',
		})
	})

	it('record create accepts --fields-json and rejects a malformed --field', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ createRecord: vi.fn().mockResolvedValue({ gid: 'r1' }) })

		await run(api, 'create', 'Q3', '--table', 't1', '--fields-json', '{"cf1":"a"}')
		await expect(run(api, 'create', 'Q3', '--table', 't1', '--field', 'nonsense')).rejects.toThrow(/gid=value/)

		expect(api.createRecord).toHaveBeenCalledTimes(1)
		expect(api.createRecord).toHaveBeenCalledWith('t1', 'Q3', { customFields: { cf1: 'a' } })
	})

	it('record update sends only what it was given and refuses an empty update', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ updateRecord: vi.fn().mockResolvedValue({ gid: 'r1' }) })

		await run(api, 'update', 'r1', '--name', 'N', '--field', 'cf1=x', '--default-access-level', 'viewer')
		await expect(run(api, 'update', 'r1')).rejects.toThrow(/nothing to update/i)

		expect(api.updateRecord).toHaveBeenCalledTimes(1)
		expect(api.updateRecord).toHaveBeenCalledWith('r1', {
			name: 'N',
			custom_fields: { cf1: 'x' },
			default_access_level: 'viewer',
		})
	})

	it('record delete is idempotent on a 404', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({
			deleteRecord: vi
				.fn()
				.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } }),
		})

		await run(api, 'delete', 'r1')

		expect(log.mock.calls.map((c) => String(c[0]))).toContain('Record r1 was already deleted')
	})

	it('record stories list and create', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble({ createRecordStory: vi.fn().mockResolvedValue({ gid: 's1' }) })

		await run(
			api,
			'stories',
			'list',
			'r1',
			'--comments-only',
			'--created-after',
			'2026-11-01T00:00:00Z',
			'--newest-first',
		)
		await run(api, 'stories', 'create', 'r1', '--text', 'hello')

		expect(api.listRecordStories).toHaveBeenCalledWith(
			'r1',
			{ commentsOnly: true, createdAfter: '2026-11-01T00:00:00Z', sortAscending: false },
			expect.objectContaining({ optFields: expect.any(String) }),
		)
		expect(api.createRecordStory).toHaveBeenCalledWith('r1', { text: 'hello' })
	})

	it('record stories create needs text or html text', async () => {
		const api = apiDouble()

		await expect(run(api, 'stories', 'create', 'r1')).rejects.toThrow(/--text or --html-text/)
		expect(api.createRecordStory).not.toHaveBeenCalled()
	})
})
