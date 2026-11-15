/**
 * The per-surface rule table: the one source of truth for what Asana accepts in rich text on each
 * surface. `check`, `fix` and `rules` all read it. A surface's claims carry their evidence: a
 * claim with no probe behind it is listed in `unverified`, never stated as a rule.
 */

/** Surfaces in the first cut. Comments and project briefs wait for a live probe (issue #349). */
export const SURFACES = ['task-notes', 'status-update'] as const
export type Surface = (typeof SURFACES)[number]

/** Every tag Asana keeps in `html_notes`, without brackets. */
const TASK_NOTES_TAGS = [
	'body',
	'h1',
	'h2',
	'h3',
	'strong',
	'em',
	'u',
	's',
	'code',
	'pre',
	'ul',
	'ol',
	'li',
	'a',
	'blockquote',
	'table',
	'tr',
	'td',
	'hr',
	'mark',
] as const

/** Tags Asana refuses on the notes surface, which authors reach for out of habit. */
export const KNOWN_REJECTED_TAGS = ['p', 'br', 'div', 'h4', 'h5', 'h6', 'img', 'del', 'sub', 'sup', 'th'] as const

const HEADING_TAGS = ['h1', 'h2', 'h3'] as const

export interface SurfaceRule {
	readonly surface: Surface
	/** Tags Asana keeps on this surface. Any other tag is a problem. */
	readonly allowed: readonly string[]
	/** Custom problem text for a tag that is not allowed here, keyed by tag name. */
	readonly messages: Readonly<Record<string, string>>
	/** What `fix` writes a heading as when this surface does not keep it. */
	readonly headingFallback: 'h3' | 'strong'
	/** Where the verified claims come from and when they were checked. */
	readonly evidence: string
	/** Tags whose rule (kept or refused) the surface inherits from task notes, with no probe on this surface. */
	readonly unverified: readonly string[]
}

const statusHeadingMessage = (tag: string) =>
	`<${tag}> is not supported in a status update (Asana escapes the whole body); use <strong> for a heading`

export const SURFACE_RULES: Readonly<Record<Surface, SurfaceRule>> = {
	'task-notes': {
		surface: 'task-notes',
		allowed: TASK_NOTES_TAGS,
		messages: {},
		headingFallback: 'h3',
		evidence: 'tidy-description.md, live PUT /tasks/{gid}, 2026-08',
		unverified: [],
	},
	'status-update': {
		surface: 'status-update',
		allowed: TASK_NOTES_TAGS.filter((tag) => !(HEADING_TAGS as readonly string[]).includes(tag)),
		messages: Object.fromEntries(HEADING_TAGS.map((tag) => [tag, statusHeadingMessage(tag)])),
		headingFallback: 'strong',
		evidence:
			'scrum-system.md §9.9 (live run 2026-11-14): h1-h3 make Asana escape the whole body; tidy-description.md (live, 2026-11): strong, ul/li, a and plain text keep their markup, and a body without <body> is refused; status-post.system.ts posts the shipped template (strong, ul/li, escaped text)',
		unverified: [
			...['blockquote', 'code', 'em', 'hr', 'mark', 'ol', 'pre', 's', 'table', 'td', 'tr', 'u'],
			...KNOWN_REJECTED_TAGS,
		],
	},
}
