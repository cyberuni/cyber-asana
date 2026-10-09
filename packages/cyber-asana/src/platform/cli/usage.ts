import type { Command } from 'commander'

// Self-correcting usage errors — principle 6. Commander's defaults print a bare
// "unknown option" line and exit 1, which tells an agent that it was wrong but
// not what to retry with. These helpers turn a usage mistake into a structured
// error that carries the valid flags for the command that raised it.

const USAGE_CODES = new Set([
	'commander.unknownOption',
	'commander.unknownCommand',
	'commander.invalidArgument',
	'commander.missingArgument',
	'commander.missingMandatoryOptionValue',
	'commander.excessArguments',
	'commander.conflictingOption',
])

export type UsageError = Error & { code: string; exitCode?: number; command?: Command }

/**
 * A usage mistake Commander itself raised while parsing. The `command` tag is
 * what installUsageErrors attaches, and it is what makes the flag list
 * possible — an InvalidArgumentError thrown from inside an action handler has
 * no command context and stays on the ordinary error path.
 */
export function isUsageError(error: unknown): error is UsageError {
	const err = error as { code?: unknown; command?: unknown } | null
	return typeof err?.code === 'string' && USAGE_CODES.has(err.code) && err.command != null
}

/** A Commander exit that is not a failure — `--help` and `--version`. */
export function isCleanCommanderExit(error: unknown): error is UsageError {
	const code = (error as { code?: unknown } | null)?.code
	if (typeof code !== 'string' || !code.startsWith('commander.')) return false
	return !USAGE_CODES.has(code)
}

/** Every flag accepted at this command or inherited from its parents. */
export function validFlags(command: Command | undefined): string[] {
	const flags: string[] = []
	const seen = new Set<string>()
	for (let cmd = command; cmd; cmd = cmd.parent ?? undefined) {
		for (const option of cmd.options) {
			if (seen.has(option.flags)) continue
			seen.add(option.flags)
			flags.push(option.flags)
		}
	}
	return flags
}

/** Full command path, e.g. `cyber-asana task list`. */
export function commandPath(command: Command | undefined): string {
	if (!command) return 'cyber-asana'
	const names: string[] = []
	for (let cmd: Command | undefined = command; cmd; cmd = cmd.parent ?? undefined) {
		if (cmd.name()) names.unshift(cmd.name())
	}
	return names.join(' ')
}

export function buildUsageErrorBody(error: UsageError) {
	const path = commandPath(error.command)
	return {
		ok: false as const,
		error: {
			kind: 'usage' as const,
			code: error.code,
			// Commander already prefixes its messages with "error: ".
			message: error.message.replace(/^error:\s*/, ''),
			command: path,
			valid_flags: validFlags(error.command),
			hint: `Run \`${path} --help\` for the full reference.`,
		},
	}
}

export function renderUsageErrorText(error: UsageError): string {
	const body = buildUsageErrorBody(error)
	const lines = [`Error: ${body.error.message}`]
	if (body.error.valid_flags.length > 0) {
		lines.push(`Valid flags for \`${body.error.command}\`:`)
		for (const flag of body.error.valid_flags) lines.push(`  ${flag}`)
	}
	lines.push(`Hint: ${body.error.hint}`)
	return lines.join('\n')
}

/**
 * Make Commander throw usage errors instead of writing to stderr and exiting,
 * so the top-level handler renders them in the selected output format. Each
 * command tags the error with itself, which is what carries the valid flags.
 */
export function installUsageErrors(program: Command) {
	const visit = (cmd: Command) => {
		cmd.exitOverride((err) => {
			throw Object.assign(err, { command: cmd })
		})
		cmd.configureOutput({ writeErr: () => {} })
		for (const sub of cmd.commands) visit(sub)
	}
	visit(program)
}
