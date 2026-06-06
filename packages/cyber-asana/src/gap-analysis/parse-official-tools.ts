const MARKDOWN_TABLE_TOOL = /\|\s*`([a-z][a-z0-9_]*)`\s*\|/g

const HTML_TABLE_ROW_TOOL = /<tr><td><code[^>]*>([a-z][a-z0-9_]*)<\/code><\/td>/g

const HTML_CODE_TOOL = /<code[^>]*>([a-z][a-z0-9_]*)<\/code>/g

const SKIP_NAMES = new Set(['Tool'])

/** Minimum/maximum expected official MCP tool count for sanity checks. */
export const OFFICIAL_TOOL_COUNT_MIN = 20
export const OFFICIAL_TOOL_COUNT_MAX = 40

export function parseOfficialTools(content: string): string[] {
	const fromMarkdown = parseMarkdownTableTools(content)
	if (fromMarkdown.length >= OFFICIAL_TOOL_COUNT_MIN) {
		return fromMarkdown
	}

	const fromTableRows = parseHtmlTableRowTools(content)
	if (fromTableRows.length >= OFFICIAL_TOOL_COUNT_MIN) {
		return fromTableRows
	}

	const fromHtml = parseHtmlCodeTools(content)
	if (fromHtml.length >= OFFICIAL_TOOL_COUNT_MIN) {
		return fromHtml
	}

	if (fromTableRows.length > 0) return fromTableRows
	if (fromMarkdown.length > 0) return fromMarkdown
	return fromHtml
}

function parseMarkdownTableTools(content: string): string[] {
	const tools = new Set<string>()
	for (const match of content.matchAll(MARKDOWN_TABLE_TOOL)) {
		const name = match[1]
		if (SKIP_NAMES.has(name)) continue
		tools.add(name)
	}
	return sortTools(tools)
}

function parseHtmlTableRowTools(content: string): string[] {
	const tools = new Set<string>()
	for (const match of content.matchAll(HTML_TABLE_ROW_TOOL)) {
		tools.add(match[1])
	}
	return sortTools(tools)
}

function parseHtmlCodeTools(content: string): string[] {
	const tools = new Set<string>()
	for (const match of content.matchAll(HTML_CODE_TOOL)) {
		const name = match[1]
		if (SKIP_NAMES.has(name)) continue
		tools.add(name)
	}
	return sortTools(tools)
}

function sortTools(tools: Set<string>): string[] {
	return [...tools].sort()
}

export function assertOfficialToolCount(tools: string[]): void {
	if (tools.length < OFFICIAL_TOOL_COUNT_MIN || tools.length > OFFICIAL_TOOL_COUNT_MAX) {
		throw new Error(
			`Expected ${OFFICIAL_TOOL_COUNT_MIN}-${OFFICIAL_TOOL_COUNT_MAX} official tools, got ${tools.length}`,
		)
	}
}
