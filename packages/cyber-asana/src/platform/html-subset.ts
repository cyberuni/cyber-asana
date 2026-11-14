/**
 * A pre-flight check of Asana rich text (`html_text`, `html_notes`) against the subset the
 * `tidy-description` reference documents, so a body Asana would refuse is caught before the call.
 * It is not an HTML parser: it reads tag names and one nesting rule. A test keeps the two lists in
 * step with the reference.
 */
export const ASANA_HTML_SUPPORTED: ReadonlySet<string> = new Set(
	'body h1 h2 h3 strong em u s code pre ul ol li a blockquote table tr td hr mark'.split(' ').map((t) => `<${t}>`),
)

/** Tags Asana refuses, which authors reach for out of habit. */
export const ASANA_HTML_REJECTED: ReadonlySet<string> = new Set(
	'p br div h4 h5 h6 img del sub sup th'.split(' ').map((t) => `<${t}>`),
)

export function findHtmlSubsetProblems(html: string): string[] {
	const problems: string[] = []
	const seen = new Set<string>()
	for (const match of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g)) {
		const tag = `<${(match[1] as string).toLowerCase()}>`
		if (ASANA_HTML_SUPPORTED.has(tag) || seen.has(tag)) continue
		seen.add(tag)
		problems.push(`${tag} is not in Asana's HTML subset`)
	}
	if (!/^\s*<body>[\s\S]*<\/body>\s*$/.test(html)) problems.push('the text must be wrapped in <body>')
	if (/<li\b/.test(html.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/g, ''))) problems.push('<li> must sit inside <ul> or <ol>')
	return problems
}
