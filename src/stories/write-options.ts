export type StoryCreateFields = {
	text?: string
	html_text?: string
}

type BuildStoryCreateInput = {
	text?: string
	htmlText?: string
}

function validateHtmlText(htmlText: string) {
	const trimmed = htmlText.trim()
	if (!/^<body(?:\s[^>]*)?>[\s\S]*<\/body>$/.test(trimmed)) {
		throw new Error('html_text must be wrapped in a single <body>...</body> root element')
	}

	const stack: string[] = []
	const tagRe = /<\/?([A-Za-z][\w:-]*)(?:\s[^<>]*)?\s*\/?>/g

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

export function buildStoryCreateFields(input: BuildStoryCreateInput): StoryCreateFields {
	if (input.text !== undefined && input.htmlText !== undefined) {
		throw new Error('--text and --html-text are mutually exclusive')
	}
	if (input.text === undefined && input.htmlText === undefined) {
		throw new Error('Provide either text or --html-text')
	}
	if (input.htmlText !== undefined) {
		validateHtmlText(input.htmlText)
		return { html_text: input.htmlText }
	}
	return { text: input.text }
}
