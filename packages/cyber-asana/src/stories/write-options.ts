/** The body and decorations every story write carries. */
type StoryFields = {
	text?: string
	html_text?: string
	is_pinned?: boolean
	sticker_name?: string
}

/** A task comment, optionally a threaded reply. */
export type StoryCreateFields = StoryFields & {
	/**
	 * The `comment_gid` of the top-level comment to reply to (read it with `opt_fields=comment_gid`),
	 * not a story gid. The parent must belong to the same task and must not itself be a reply.
	 */
	parent_comment?: string
}

/** A goal comment; goals have no threaded replies. */
export type GoalStoryCreateFields = StoryFields

/** Filters of a story list; they ride beside the pagination options. */
export type StoryListFilters = {
	/** ISO 8601 date-time; exclusive, second granularity. */
	createdAfter?: string
	/** Only comments (`resource_subtype=comment_added`), the one subtype Asana supports. */
	commentsOnly?: boolean
	/** Oldest first when true (Asana's default), newest first when false. */
	sortAscending?: boolean
}

/** Asana's fixed sticker vocabulary; anything else is rejected before a request is sent. */
export const STICKER_NAMES = [
	'green_checkmark',
	'people_dancing',
	'dancing_unicorn',
	'heart',
	'party_popper',
	'people_waving_flags',
	'splashing_narwhal',
	'trophy',
	'yeti_riding_unicorn',
	'celebrating_people',
	'determined_climbers',
	'phoenix_spreading_love',
] as const

/** An edit replaces the comment body, so it carries the same fields a create does. */
export type StoryUpdateFields = StoryFields

type BuildStoryCreateInput = {
	text?: string
	htmlText?: string
	isPinned?: boolean
	stickerName?: string
	parentComment?: string
}

/** Rejects a `created_after` Asana could not read; the bound is an ISO 8601 date-time. */
export function validateCreatedAfter(value: string): string {
	if (Number.isNaN(Date.parse(value))) {
		throw new Error(`created_after must be an ISO 8601 date-time, got "${value}"`)
	}
	return value
}

function validateHtmlText(htmlText: string) {
	const trimmed = htmlText.trim()
	if (!/^<body(?:\s[^>]*)?>[\s\S]*<\/body>$/.test(trimmed)) {
		throw new Error('html_text must be wrapped in a single <body>...</body> root element')
	}

	const stack: string[] = []
	const tagRe = /<\/?([A-Za-z][\w:-]*)(?:\s[^<>]*)?\/?>/g

	for (const match of trimmed.matchAll(tagRe)) {
		const [full, tagName] = match
		const normalizedTag = tagName
		if (full.startsWith('</')) {
			const current = stack.pop()
			if (current !== normalizedTag) {
				throw new Error('html_text has unbalanced closing tags')
			}
			continue
		}
		if (!full.endsWith('/>')) {
			stack.push(normalizedTag)
		}
	}

	if (stack.length > 0) {
		throw new Error('html_text has unbalanced closing tags')
	}
}

/** The comment body, or undefined when the caller left both text forms out. */
function buildStoryBody(input: BuildStoryCreateInput): StoryFields | undefined {
	if (input.text !== undefined && input.htmlText !== undefined) {
		throw new Error('--text and --html-text are mutually exclusive')
	}
	if (input.htmlText !== undefined) {
		validateHtmlText(input.htmlText)
		return { html_text: input.htmlText }
	}
	if (input.text !== undefined) return { text: input.text }
	return undefined
}

export function validateStickerName(stickerName: string) {
	if (!(STICKER_NAMES as readonly string[]).includes(stickerName)) {
		throw new Error(`sticker_name must be one of ${STICKER_NAMES.join(', ')}`)
	}
}

function withDecorations(body: StoryFields | undefined, input: BuildStoryCreateInput): StoryFields {
	if (input.stickerName !== undefined) validateStickerName(input.stickerName)
	return {
		...body,
		...(input.isPinned !== undefined && { is_pinned: input.isPinned }),
		...(input.stickerName !== undefined && { sticker_name: input.stickerName }),
	}
}

export function buildStoryCreateFields(input: BuildStoryCreateInput): StoryCreateFields {
	const body = buildStoryBody(input)
	// Asana only creates comment stories, and a comment without a body is not one.
	if (!body) throw new Error('Provide either text or --html-text')
	return {
		...withDecorations(body, input),
		...(input.parentComment !== undefined && { parent_comment: input.parentComment }),
	}
}

export function buildStoryUpdateFields(input: BuildStoryCreateInput): StoryUpdateFields {
	const body = buildStoryBody(input)
	// Pinning and stickering are edits in their own right, so an update needs a
	// body only when nothing else was asked for.
	if (!body && input.isPinned === undefined && input.stickerName === undefined) {
		throw new Error('Provide text, --html-text, --pin, --unpin, or --sticker')
	}
	return withDecorations(body, input)
}
