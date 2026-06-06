export type McpCatalog = {
	source: string
	fetched_at: string
	tool_count: number
	tools: string[]
}

export type OverlapEntry = {
	official: string
	cyber: string
	confidence: 'high' | 'partial'
}

export type OverlapReportEntry = OverlapEntry & {
	note?: string
}

export type CatalogDiff = {
	added: string[]
	removed: string[]
	unchanged: string[]
	baseline_path: string
	fetched_at: string
	tool_count_before: number
	tool_count_after: number
}

export type GapReport = {
	generated_at: string
	official_source: string
	cyber_source: string
	official_count: number
	cyber_count: number
	official_only: string[]
	cyber_only: string[]
	overlap: OverlapReportEntry[]
	unmapped_official: string[]
	unmapped_cyber: string[]
}
