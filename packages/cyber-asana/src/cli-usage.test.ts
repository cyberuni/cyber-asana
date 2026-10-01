import { Command } from 'commander'
import { describe, expect, it } from 'vitest'
import { exitCodeFor, renderCliError } from './cli-error.js'
import { commandPath, installUsageErrors, isCleanCommanderExit, isUsageError, validFlags } from './cli-usage.js'

function buildProgram() {
	const program = new Command()
		.name('cyber-asana')
		.exitOverride()
		.option('--json', 'Output raw JSON')
		.option('--toon', 'Output TOON')
	const task = program.command('task').description('Manage tasks')
	task
		.command('list')
		.description('List tasks')
		.option('--project-gid <gid>', 'Project GID')
		.option('--limit <number>', 'Results per page')
		.action(() => {})
	installUsageErrors(program)
	return program
}

async function usageErrorFrom(argv: string[]) {
	try {
		await buildProgram().parseAsync(['node', 'test', ...argv], { from: 'node' })
	} catch (error) {
		return error
	}
	throw new Error('expected a usage error')
}

describe('unknown flags', () => {
	it('are recognized as usage errors', async () => {
		expect(isUsageError(await usageErrorFrom(['task', 'list', '--projct-gid', 'p1']))).toBe(true)
	})

	it('exit with code 2 rather than the generic 1', async () => {
		expect(exitCodeFor(await usageErrorFrom(['task', 'list', '--nope']))).toBe(2)
	})

	it('list the flags the command actually accepts, including inherited ones', async () => {
		const text = renderCliError(await usageErrorFrom(['task', 'list', '--nope']), 'text')
		expect(text).toContain('Valid flags for `cyber-asana task list`:')
		expect(text).toContain('--project-gid <gid>')
		expect(text).toContain('--limit <number>')
		expect(text).toContain('--json')
		expect(text).toContain('Hint: Run `cyber-asana task list --help`')
	})

	it('carry the same detail in json output', async () => {
		const body = JSON.parse(renderCliError(await usageErrorFrom(['task', 'list', '--nope']), 'json'))
		expect(body.ok).toBe(false)
		expect(body.error.kind).toBe('usage')
		expect(body.error.command).toBe('cyber-asana task list')
		expect(body.error.valid_flags).toContain('--project-gid <gid>')
	})

	it('carry the same detail in toon output', async () => {
		const toon = renderCliError(await usageErrorFrom(['task', 'list', '--nope']), 'toon')
		expect(toon).toContain('kind: usage')
	})
})

describe('other usage mistakes', () => {
	it('treats an unknown subcommand as a usage error', async () => {
		expect(exitCodeFor(await usageErrorFrom(['task', 'lst']))).toBe(2)
	})

	it('treats an excess positional argument as a usage error', async () => {
		const error = await usageErrorFrom(['task', 'list', 'extra'])
		expect(isUsageError(error)).toBe(true)
		expect(exitCodeFor(error)).toBe(2)
		expect(renderCliError(error, 'text')).toMatch(/^Error: too many arguments for 'list'/)
	})

	it('does not double the "error:" prefix Commander already adds', async () => {
		const text = renderCliError(await usageErrorFrom(['task', 'list', '--nope']), 'text')
		expect(text.startsWith("Error: unknown option '--nope'")).toBe(true)
	})

	it('leaves an InvalidArgumentError thrown from an action on the ordinary path', () => {
		// No command tag: this came from a handler, not from Commander's parser,
		// so there is no flag list to offer and the generic exit code stands.
		const thrownInAction = Object.assign(new Error('Project GID is required'), {
			code: 'commander.invalidArgument',
		})
		expect(isUsageError(thrownInAction)).toBe(false)
		expect(exitCodeFor(thrownInAction)).toBe(1)
	})
})

describe('isCleanCommanderExit', () => {
	it('is true for --help, which is not a failure', async () => {
		const program = buildProgram()
		program.configureOutput({ writeOut: () => {} })
		let caught: unknown
		try {
			await program.parseAsync(['node', 'test', '--help'], { from: 'node' })
		} catch (error) {
			caught = error
		}
		expect(isCleanCommanderExit(caught)).toBe(true)
		expect(isUsageError(caught)).toBe(false)
	})

	it('is false for a plain error', () => {
		expect(isCleanCommanderExit(new Error('boom'))).toBe(false)
	})
})

describe('validFlags and commandPath', () => {
	it('fall back safely when no command is attached', () => {
		expect(validFlags(undefined)).toEqual([])
		expect(commandPath(undefined)).toBe('cyber-asana')
	})
})
