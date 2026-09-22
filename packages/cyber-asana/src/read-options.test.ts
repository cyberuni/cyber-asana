import { Command } from 'commander'
import { describe, expect, it } from 'vitest'
import { addReadOptions, readOptionsFromCli } from './cli-options.js'
import { readOptions, readParams } from './mcp-options.js'
import { toAsanaReadOptions } from './read-options.js'

describe('toAsanaReadOptions', () => {
	it('sends no opt_fields when none are requested, so the default read shape is unchanged', () => {
		expect(toAsanaReadOptions()).toEqual({})
		expect(toAsanaReadOptions({})).toEqual({})
	})

	it('forwards requested fields as opt_fields', () => {
		expect(toAsanaReadOptions({ optFields: 'name,notes' })).toEqual({ opt_fields: 'name,notes' })
	})

	it('falls back to a domain default field set when none are requested', () => {
		expect(toAsanaReadOptions(undefined, 'gid,name')).toEqual({ opt_fields: 'gid,name' })
	})

	it('lets requested fields replace the domain default', () => {
		expect(toAsanaReadOptions({ optFields: 'notes' }, 'gid,name')).toEqual({ opt_fields: 'notes' })
	})
})

describe('addReadOptions / readOptionsFromCli', () => {
	async function parse(args: string[]) {
		let captured: unknown
		const program = new Command()
		addReadOptions(program.command('get <gid>')).action((_gid: string, opts: { optFields?: string }) => {
			captured = readOptionsFromCli(opts)
		})
		await program.parseAsync(['node', 'test', 'get', '1', ...args], { from: 'node' })
		return captured
	}

	it('adds --opt-fields to a get command', async () => {
		expect(await parse(['--opt-fields', 'name,notes'])).toEqual({ optFields: 'name,notes' })
	})

	it('yields no read options when --opt-fields is absent', async () => {
		expect(await parse([])).toBeUndefined()
	})
})

describe('readParams / readOptions', () => {
	it('exposes opt_fields as an optional MCP parameter', () => {
		expect(readParams.opt_fields.safeParse(undefined).success).toBe(true)
		expect(readParams.opt_fields.safeParse('name').success).toBe(true)
	})

	it('maps opt_fields to read options', () => {
		expect(readOptions({ opt_fields: 'name' })).toEqual({ optFields: 'name' })
	})

	it('yields no read options when opt_fields is absent', () => {
		expect(readOptions({})).toBeUndefined()
	})
})
