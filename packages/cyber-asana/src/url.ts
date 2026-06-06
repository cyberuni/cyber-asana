export type AsanaUrlKind = 'project_list' | 'project_task' | 'project' | 'legacy_task' | 'unknown'

export type ParsedAsanaUrl = {
	kind: AsanaUrlKind
	url: string
	workspace_gid: string | null
	project_gid: string | null
	task_gid: string | null
	/** Browser list-view GID from the URL bar — not a Sections API section GID. */
	list_view_gid: string | null
}

const GID = String.raw`\d+`

type PatternMatch = {
	kind: Exclude<AsanaUrlKind, 'unknown'>
	exec: (pathname: string) => Omit<ParsedAsanaUrl, 'kind' | 'url'> | null
}

const PATTERNS: PatternMatch[] = [
	{
		kind: 'project_list',
		exec: (pathname) => {
			const match = pathname.match(new RegExp(`^/1/(${GID})/project/(${GID})/list/(${GID})$`))
			if (!match) return null
			return {
				workspace_gid: match[1],
				project_gid: match[2],
				task_gid: null,
				list_view_gid: match[3],
			}
		},
	},
	{
		kind: 'project_task',
		exec: (pathname) => {
			const match = pathname.match(new RegExp(`^/1/(${GID})/project/(${GID})/task/(${GID})$`))
			if (!match) return null
			return {
				workspace_gid: match[1],
				project_gid: match[2],
				task_gid: match[3],
				list_view_gid: null,
			}
		},
	},
	{
		kind: 'project',
		exec: (pathname) => {
			const match = pathname.match(new RegExp(`^/1/(${GID})/project/(${GID})$`))
			if (!match) return null
			return {
				workspace_gid: match[1],
				project_gid: match[2],
				task_gid: null,
				list_view_gid: null,
			}
		},
	},
	{
		kind: 'legacy_task',
		exec: (pathname) => {
			const match = pathname.match(new RegExp(`^/0/(${GID})/(${GID})$`))
			if (!match) return null
			return {
				workspace_gid: match[1],
				project_gid: null,
				task_gid: match[2],
				list_view_gid: null,
			}
		},
	},
]

function normalizeInput(url: string) {
	const trimmed = url.trim()
	if (!trimmed) throw new Error('URL is required')
	return trimmed
}

function pathnameFromUrl(url: string) {
	try {
		return new URL(url).pathname.replace(/\/+$/, '') || '/'
	} catch {
		return null
	}
}

export function parseAsanaUrl(input: string): ParsedAsanaUrl {
	const url = normalizeInput(input)
	const pathname = pathnameFromUrl(url)
	if (!pathname) {
		return {
			kind: 'unknown',
			url,
			workspace_gid: null,
			project_gid: null,
			task_gid: null,
			list_view_gid: null,
		}
	}

	for (const pattern of PATTERNS) {
		const fields = pattern.exec(pathname)
		if (fields) {
			return { kind: pattern.kind, url, ...fields }
		}
	}

	return {
		kind: 'unknown',
		url,
		workspace_gid: null,
		project_gid: null,
		task_gid: null,
		list_view_gid: null,
	}
}
