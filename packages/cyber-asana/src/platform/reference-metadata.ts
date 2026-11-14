import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseReferenceName, referenceLayers, resolveReference } from 'cyber-agentkit'

/** The plugin name this package ships its references under, so a `cyber-asana/<name>` option names it. */
const PLUGIN_NAME = 'cyber-asana'

/** The status cyber-agentkit reports for a name it cannot put in one order; the CLI and MCP stop on it. */
export const REFERENCE_AMBIGUOUS = 'reference-ambiguous'

/**
 * A reference name that more than one plugin ships, with nothing chosen between them. The CLI and
 * MCP cannot ask which to build on, so they stop and list the options; a skill settles it through
 * the `reference` skill of cyber-agentkit, which saves the pick with `reference customize`.
 */
export class ReferenceAmbiguousError extends Error {
	readonly code = REFERENCE_AMBIGUOUS
	readonly hint: string

	constructor(
		readonly reference: string,
		readonly options: readonly string[],
	) {
		super(`${reference} is ambiguous: ${options.join(', ')} all ship it`)
		this.name = 'ReferenceAmbiguousError'
		this.hint = `Pick the one to build on with the reference skill of cyber-agentkit, or run \`npx cyber-agentkit reference customize ${reference} --extends <option>\` (add \`--scope user\` for only yourself).`
	}
}

export function isReferenceAmbiguousError(error: unknown): error is ReferenceAmbiguousError {
	return error instanceof ReferenceAmbiguousError
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

export type LoadReferenceMetadataOptions = {
	/** The repository root. Defaults to the working directory. */
	root?: string
	/** The working folder; defaults to `process.cwd()`. */
	cwd?: string
	home?: string
	platform?: NodeJS.Platform
	env?: Readonly<Record<string, string | undefined>>
	/** This package's root, whose `references/` holds the shipped copy. */
	packageRoot?: string
}

/**
 * The composed frontmatter of a reference, read through the cyber-agentkit tiers (managed, repo,
 * user, installed plugins, then the copy this package ships) and handed to `parse`. Resolution is
 * cyber-agentkit's: this adds nothing to it. Returns undefined when no tier ships the name, and
 * throws `ReferenceAmbiguousError` when the name is ambiguous. A project section's frontmatter is
 * not part of the composed metadata, so it never reaches `parse`.
 */
export async function loadReferenceMetadata<T>(
	name: string,
	parse: (metadata: Record<string, unknown>) => T,
	opts: LoadReferenceMetadataOptions = {},
): Promise<T | undefined> {
	const layers = await referenceLayers({
		root: opts.root ?? process.cwd(),
		...(opts.cwd !== undefined && { cwd: opts.cwd }),
		home: opts.home ?? homedir(),
		platform: opts.platform ?? process.platform,
		env: opts.env ?? process.env,
		plugin: { name: PLUGIN_NAME, root: opts.packageRoot ?? packageRoot() },
	})
	const resolved = resolveReference(parseReferenceName(name), layers)
	if (resolved.status === 'ambiguous') throw new ReferenceAmbiguousError(name, resolved.options ?? [])
	if (resolved.status !== 'found') return undefined
	return parse(resolved.metadata ?? {})
}
