// Content truncation with size hints — principle 3.
// Large free-text fields (task notes, comment bodies) are trimmed for
// human-readable output, with an explicit size hint and a --full escape hatch.

export const DEFAULT_TEXT_LIMIT = 500

export function isFull(argv: string[] = process.argv): boolean {
	return argv.includes('--full')
}

export function truncate(value: string | null | undefined, opts?: { limit?: number; full?: boolean }): string {
	if (value == null) return ''
	const limit = opts?.limit ?? DEFAULT_TEXT_LIMIT
	if (opts?.full || value.length <= limit) return value
	return `${value.slice(0, limit)}… [truncated, ${value.length} chars total; use --full for the rest]`
}
