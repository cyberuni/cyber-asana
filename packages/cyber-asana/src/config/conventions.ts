import { type LoadReferenceMetadataOptions, loadReferenceMetadata } from '../platform/reference-metadata.js'

/**
 * The reference whose frontmatter holds the repo's task conventions. It is the only source of
 * them: resolved through the cyber-agentkit layers (managed, repo, user, installed plugins,
 * then the copy this package ships) and merged key by key.
 */
const CONVENTIONS_REFERENCE = 'cyber-asana.task-conventions'

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

export type LoadConventionsOptions = LoadReferenceMetadataOptions

/**
 * The task conventions from the resolved `cyber-asana.task-conventions` frontmatter, or undefined
 * when nothing sets them. An ambiguous name throws `ReferenceAmbiguousError` (D13): a task created
 * without the conventions the team chose would be wrong in a way nobody sees.
 */
export async function loadConventions(opts: LoadConventionsOptions = {}): Promise<RepoConventions | undefined> {
	return loadReferenceMetadata(CONVENTIONS_REFERENCE, parseConventions, opts)
}
