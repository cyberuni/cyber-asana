export type RestOperation = {
	operationId: string
	method: string
	path: string
	tag: string
	deprecated: boolean
}

export type RestCatalog = {
	source: string
	fetched_at: string
	operation_count: number
	operations: RestOperation[]
}

export type RestDiff = {
	added: RestOperation[]
	removed: RestOperation[]
	newly_deprecated: RestOperation[]
	baseline_path: string
	fetched_at: string
	operation_count_before: number
	operation_count_after: number
}
