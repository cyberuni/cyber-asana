import type { ReadOptions } from '../platform/read-options.js'
import type { OooEntryListOptions, OooEntryWriteFields, OooGateway } from './gateway.js'

export type OooApi = ReturnType<typeof createOooApi>

export function createOooApi(gateway: OooGateway) {
	return {
		listOooEntries(userGid: string, workspaceGid: string, opts?: OooEntryListOptions) {
			return gateway.listOooEntries(userGid, workspaceGid, opts)
		},
		getOooEntry(oooEntryGid: string, opts?: ReadOptions) {
			return gateway.getOooEntry(oooEntryGid, opts)
		},
		createOooEntry(
			userGid: string,
			workspaceGid: string,
			fields: { start_date: string; end_date: string },
			opts?: ReadOptions,
		) {
			return gateway.createOooEntry(userGid, workspaceGid, fields, opts)
		},
		updateOooEntry(oooEntryGid: string, fields: OooEntryWriteFields, opts?: ReadOptions) {
			return gateway.updateOooEntry(oooEntryGid, fields, opts)
		},
		deleteOooEntry(oooEntryGid: string) {
			return gateway.deleteOooEntry(oooEntryGid)
		},
	}
}
