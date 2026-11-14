/**
 * A configuration failure with a stable, machine-readable `code` an agent can branch on, such as
 * `scope-missing` or `scope-unknown`. It is not an Asana API error and not a bug: the caller can fix
 * the config or the command line and retry. `options` lists the choices that settle it.
 */
export class CodedConfigError extends Error {
	readonly options?: readonly string[]
	readonly hint?: string

	constructor(
		readonly code: string,
		message: string,
		detail: { options?: readonly string[]; hint?: string } = {},
	) {
		super(message)
		this.name = 'CodedConfigError'
		if (detail.options !== undefined) this.options = detail.options
		if (detail.hint !== undefined) this.hint = detail.hint
	}
}

export function isCodedConfigError(error: unknown): error is CodedConfigError {
	return error instanceof CodedConfigError
}
