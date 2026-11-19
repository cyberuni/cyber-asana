export type RestOperation = {
	operationId: string
	method: string
	path: string
	tag: string
	deprecated: boolean
	/** Request parameters a command could expose; absent in catalogs written before they were tracked. */
	parameters?: RestParameter[]
}

/** A path, query, or top-level body (`data.<name>`) parameter of one operation. */
export type RestParameter = {
	name: string
	in: 'path' | 'query' | 'body'
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
	/** Parameters an operation in both catalogs gained; empty when the baseline predates parameters. */
	added_parameters: AddedRestParameter[]
	baseline_path: string
	fetched_at: string
	operation_count_before: number
	operation_count_after: number
}

export type AddedRestParameter = RestParameter & { operationId: string }
