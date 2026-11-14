import { referenceImplementations } from 'cyber-agentkit'
import { type LoadReferenceMetadataOptions, loadReferenceLayers } from './reference-metadata.js'

export type ReferenceImplementationInfo = {
	/** The reference's name, such as `cyber-asana.report.health`. */
	name: string
	/** What a consumer loads: a plugin's qualified name, or a repo or user implementation's bare name. */
	pin: string
	description: string
}

/**
 * The implementations of a `many` interface that this repo, the user, and the installed plugins
 * ship, as cyber-agentkit lists them (`implementations`). An interface nobody ships is an empty
 * list, not an error.
 */
export async function listReferenceImplementations(
	interfaceName: string,
	opts: LoadReferenceMetadataOptions = {},
): Promise<ReferenceImplementationInfo[]> {
	const layers = await loadReferenceLayers(opts)
	try {
		return referenceImplementations(interfaceName, layers).implementations.map(({ name, pin, description }) => ({
			name,
			pin,
			description,
		}))
	} catch (error) {
		if ((error as { code?: string }).code === 'interface-unknown' || /unknown interface/i.test(String(error))) return []
		throw error
	}
}
