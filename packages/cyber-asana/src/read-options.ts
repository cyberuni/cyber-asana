/**
 * Options for a singular read (`GET /<resource>/{gid}`). Every such Asana
 * endpoint accepts `opt_fields`; list endpoints carry the same field through
 * `PaginationOptions`.
 */
export type ReadOptions = {
	optFields?: string
}

/**
 * SDK params for a singular read. With no requested fields, a domain default
 * applies when given; otherwise nothing is sent and Asana returns its default
 * compact representation.
 */
export function toAsanaReadOptions(opts?: ReadOptions, defaultOptFields?: string): { opt_fields?: string } {
	const optFields = opts?.optFields ?? defaultOptFields
	return optFields === undefined ? {} : { opt_fields: optFields }
}
