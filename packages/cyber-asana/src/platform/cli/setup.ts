import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Command } from 'commander'
import { output, printFields } from './output.js'

// Ambient context — principle 7. An agent should not have to remember to ask
// who it is authenticated as; a SessionStart hook puts that in front of it at
// the start of every session.

export const HOOK_COMMAND = 'cyber-asana --toon'
const DEFAULT_SETTINGS_PATH = join('.claude', 'settings.json')

type HookEntry = { type?: string; command?: string }
type HookMatcher = { matcher?: string; hooks?: HookEntry[] }
type Settings = { hooks?: Record<string, HookMatcher[]> } & Record<string, unknown>

async function readSettings(path: string): Promise<Settings> {
	try {
		return JSON.parse(await readFile(path, 'utf-8')) as Settings
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return {}
		throw error
	}
}

/** True when a SessionStart hook already runs this CLI. */
export function hasCyberAsanaHook(settings: Settings): boolean {
	const sessionStart = settings.hooks?.SessionStart ?? []
	return sessionStart.some((matcher) =>
		(matcher.hooks ?? []).some((hook) => typeof hook.command === 'string' && hook.command.includes('cyber-asana')),
	)
}

/** Returns the settings with the hook added. Adding twice is a no-op. */
export function withSessionStartHook(settings: Settings): Settings {
	if (hasCyberAsanaHook(settings)) return settings
	const hooks = { ...(settings.hooks ?? {}) }
	hooks.SessionStart = [...(hooks.SessionStart ?? []), { hooks: [{ type: 'command', command: HOOK_COMMAND }] }]
	return { ...settings, hooks }
}

export function setupCommand() {
	const cmd = new Command('setup').description('Set up ambient cyber-asana context for coding agents')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana setup hook',
			'  cyber-asana setup hook --dry-run',
			'  cyber-asana setup hook --settings .claude/settings.local.json',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	cmd
		.command('hook')
		.description('Install a SessionStart hook so each agent session starts with live Asana context')
		.option('--settings <path>', `Settings file to write (default: ${DEFAULT_SETTINGS_PATH})`)
		.option('--dry-run', 'Show what would change without writing')
		.action(async (opts: { settings?: string; dryRun?: boolean }) => {
			const path = opts.settings ?? DEFAULT_SETTINGS_PATH
			const settings = await readSettings(path)
			const alreadyInstalled = hasCyberAsanaHook(settings)
			const next = withSessionStartHook(settings)

			if (!alreadyInstalled && !opts.dryRun) {
				await mkdir(dirname(path), { recursive: true })
				await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
			}

			const result = {
				path,
				command: HOOK_COMMAND,
				already_installed: alreadyInstalled,
				written: !alreadyInstalled && !opts.dryRun,
			}
			output(result, () =>
				printFields({
					Path: result.path,
					Hook: result.command,
					Status: result.already_installed
						? 'already installed'
						: result.written
							? 'installed'
							: 'not written (--dry-run)',
				}),
			)
		})

	return cmd
}
