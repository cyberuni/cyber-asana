import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createAttachmentApi } from './api.js'
import { defineAttachmentCreateAcceptanceSpecs } from './create-attachment.acceptance.js'
import type { AttachmentGateway } from './gateway.js'

const parentGid = 'task-test'

const fixtureDir = mkdtempSync(join(tmpdir(), 'cyber-asana-attachments-'))
const filePath = join(fixtureDir, 'sprint.md')
writeFileSync(filePath, '# Sprint report\n')

function createAttachmentGatewayDouble(): AttachmentGateway {
	return {
		listAttachments: vi.fn(),
		getAttachment: vi.fn(),
		createAttachment: vi.fn().mockResolvedValue({ gid: 'att1', name: 'sprint.md' }),
		deleteAttachment: vi.fn(),
	}
}

async function readStream(stream: NodeJS.ReadableStream) {
	const chunks: Buffer[] = []
	for await (const chunk of stream) chunks.push(Buffer.from(chunk))
	return Buffer.concat(chunks).toString('utf8')
}

describe(
	'attachments/create acceptance',
	defineAttachmentCreateAcceptanceSpecs({
		getApi: () => createAttachmentApi(createAttachmentGatewayDouble()),
		parentGid,
		filePath,
	}),
)

describe('attachments/create acceptance gateway double', () => {
	it('streams the file contents to the gateway under the basename', async () => {
		const gateway = createAttachmentGatewayDouble()
		const api = createAttachmentApi(gateway)

		await api.createAttachment(parentGid, { file: filePath })

		expect(gateway.createAttachment).toHaveBeenCalledWith(
			expect.objectContaining({ parent: parentGid, name: 'sprint.md' }),
			undefined,
		)
		const [{ file }] = vi.mocked(gateway.createAttachment).mock.calls[0]!
		expect(await readStream(file as NodeJS.ReadableStream)).toBe('# Sprint report\n')
	})

	it('sends an external url attachment without a file', async () => {
		const gateway = createAttachmentGatewayDouble()
		const api = createAttachmentApi(gateway)

		await api.createAttachment(parentGid, { url: 'https://example.com/design', name: 'Design doc' })

		expect(gateway.createAttachment).toHaveBeenCalledWith(
			{
				parent: parentGid,
				url: 'https://example.com/design',
				name: 'Design doc',
				resourceSubtype: 'external',
			},
			undefined,
		)
	})

	it('does not call the gateway when the input names both a file and a url', async () => {
		const gateway = createAttachmentGatewayDouble()
		const api = createAttachmentApi(gateway)

		await expect(api.createAttachment(parentGid, { file: filePath, url: 'https://example.com' })).rejects.toThrow(
			/mutually exclusive/,
		)

		expect(gateway.createAttachment).not.toHaveBeenCalled()
	})

	it('does not call the gateway when the file cannot be read', async () => {
		const gateway = createAttachmentGatewayDouble()
		const api = createAttachmentApi(gateway)

		await expect(api.createAttachment(parentGid, { file: join(fixtureDir, 'missing.md') })).rejects.toThrow(
			/missing\.md/,
		)

		expect(gateway.createAttachment).not.toHaveBeenCalled()
	})
})
