import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseReferenceName, referenceLayers, resolveReference } from 'cyber-agentkit'

/**
 * The reference whose frontmatter holds the repo's task conventions. It is the only source of
 * them: resolved through the cyber-agentkit layers (managed, repo, user, installed plugins,
 * then the copy this package ships) and merged key by key.
 */
const CONVENTIONS_REFERENCE = 'cyber-asana.task-conventions'

const PLUGIN_NAME = 'cyber-asana'

/** Repo house style, so an agent writes tasks the way this repo writes them. */
export type RepoConventions = {
	/** A task title shape, e.g. `<area>: <summary>`. */
	task_name_format?: string
	/** A description skeleton new tasks start from. */
	description_template?: string
	/** Tags applied to new tasks, each a tag GID or a tag name resolved in the workspace. */
	default_tags?: string[]
}

const CONVENTIONS_KEYS = ['task_name_format', 'description_template', 'default_tags'] as const

/**
 * Pick the convention keys out of a reference's frontmatter. Other keys (`description`, `tags`,
 * `merge`, …) belong to the reference itself and are ignored; a convention key with a bad value
 * throws, so a typo reports itself instead of silently doing nothing.
 */
export function parseConventions(metadata: Record<string, unknown>): RepoConventions | undefined {
	const conventions: RepoConventions = {}
	for (const key of CONVENTIONS_KEYS) {
		const value = metadata[key]
		if (value === undefined) continue
		if (key === 'default_tags') {
			if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string' || tag.length === 0)) {
				throw new Error(`${CONVENTIONS_REFERENCE}: default_tags must be a list of non-empty strings`)
			}
			conventions.default_tags = value as string[]
			continue
		}
		if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`${CONVENTIONS_REFERENCE}: ${key} must be a non-empty string`)
		}
		conventions[key] = value
	}
	return Object.keys(conventions).length === 0 ? undefined : conventions
}

/** The nearest folder holding a `package.json`, which is this package's root from `src/` and `dist/` alike. */
export function packageRoot(from: string = fileURLToPath(import.meta.url)): string {
	let dir = dirname(from)
	for (;;) {
		if (existsSync(join(dir, 'package.json'))) return dir
		const parent = dirname(dir)
		if (parent === dir) return dirname(from)
		dir = parent
	}
}

export type LoadConventionsOptions = {
	/** Where the repo lookup starts. Defaults to the working directory. */
	root?: string
	home?: string
	platform?: NodeJS.Platform
	env?: Readonly<Record<string, string | undefined>>
	/** This package's root, whose `references/` holds the shipped copy. */
	packageRoot?: string
	warn?: (message: string) => void
}

/**
 * The task conventions from the resolved `cyber-asana.task-conventions` frontmatter, or undefined
 * when nothing sets them. An ambiguous name warns rather than throws, so a normal task create
 * still goes through.
 */
export async function loadConventions(opts: LoadConventionsOptions = {}): Promise<RepoConventions | undefined> {
	const warn = opts.warn ?? ((message: string) => console.error(`warning: ${message}`))
	const layers = await referenceLayers({
		root: opts.root ?? process.cwd(),
		home: opts.home ?? homedir(),
		platform: opts.platform ?? process.platform,
		env: opts.env ?? process.env,
		plugin: { name: PLUGIN_NAME, root: opts.packageRoot ?? packageRoot() },
	})
	const resolved = resolveReference(parseReferenceName(CONVENTIONS_REFERENCE), layers)
	if (resolved.status === 'ambiguous') {
		warn(
			`${CONVENTIONS_REFERENCE} is ambiguous: ${(resolved.options ?? []).join(', ')} all ship it, so no task conventions apply. Set them in .agents/references/${CONVENTIONS_REFERENCE}.md instead.`,
		)
		return undefined
	}
	if (resolved.status !== 'found' || !resolved.metadata) return undefined
	return parseConventions(resolved.metadata)
}
