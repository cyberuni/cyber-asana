/**
 * The per-surface rule table: the one source of truth for what Asana accepts in rich text on each
 * surface. `check`, `fix` and `rules` all read it. A surface's claims carry their evidence: a
 * claim with no probe behind it is listed in `unverified`, never stated as a rule.
 */

/** Surfaces with a live probe behind their rules (`surfaces.system.ts`). */
export const SURFACES = ['task-notes', 'comment', 'project-brief', 'status-update'] as const
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

/** Tags a status update escapes, together with the whole body, although task notes keep them. */
const STATUS_ESCAPED_TAGS = [...HEADING_TAGS, 'table', 'tr', 'td', 'hr'] as const

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

const statusEscapedMessage = (tag: string) =>
	(HEADING_TAGS as readonly string[]).includes(tag)
		? `<${tag}> is not supported in a status update (Asana escapes the whole body); use <strong> for a heading`
		: `<${tag}> is not supported in a status update (Asana escapes the whole body)`

export const SURFACE_RULES: Readonly<Record<Surface, SurfaceRule>> = {
	'task-notes': {
		surface: 'task-notes',
		allowed: TASK_NOTES_TAGS,
		messages: {},
		headingFallback: 'h3',
		evidence: 'tidy-description.md, live PUT /tasks/{gid}, 2026-08',
		unverified: [],
	},
	comment: {
		surface: 'comment',
		allowed: TASK_NOTES_TAGS,
		messages: {},
		headingFallback: 'h3',
		evidence:
			'surfaces.system.ts, live POST /tasks/{gid}/stories, 2026-11-15: every task-notes tag is kept; the refused tags are stored as literal text, so the comment posts but shows its markup',
		unverified: [],
	},
	'project-brief': {
		surface: 'project-brief',
		allowed: TASK_NOTES_TAGS,
		messages: {},
		headingFallback: 'h3',
		evidence:
			'surfaces.system.ts, live POST and PUT /project_briefs, 2026-11-15: every task-notes tag is kept and every refused tag fails with "XML is invalid"',
		unverified: [],
	},
	'status-update': {
		surface: 'status-update',
		allowed: TASK_NOTES_TAGS.filter((tag) => !(STATUS_ESCAPED_TAGS as readonly string[]).includes(tag)),
		messages: Object.fromEntries(STATUS_ESCAPED_TAGS.map((tag) => [tag, statusEscapedMessage(tag)])),
		headingFallback: 'strong',
		evidence:
			'surfaces.system.ts, live POST /status_updates on a project, 2026-11-15: strong, em, u, s, code, pre, ul, ol, li, a, blockquote and mark keep their markup; h1-h3, table, tr, td and hr make Asana escape the whole body, as do the tags task notes refuse; scrum-system.md §9.9 (2026-11-14) first found the heading failure, and tidy-description.md (2026-11) the <body> requirement; status-post.system.ts posts the shipped template (strong, ul/li, escaped text)',
		unverified: [],
	},
}
