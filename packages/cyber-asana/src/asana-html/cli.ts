import { readFile } from 'node:fs/promises'
import { Command, InvalidArgumentError } from 'commander'
import { output, printFields, printNextSteps } from '../platform/cli/output.js'
import { htmlCheckResult, htmlFixResult, htmlRulesFor, SURFACES, type Surface } from './api.js'

function surfaceOption(value: string): Surface {
	if (!(SURFACES as readonly string[]).includes(value)) {
		throw new InvalidArgumentError(`Unknown surface "${value}". Expected one of: ${SURFACES.join(', ')}`)
	}
	return value as Surface
}

/** The HTML from a file, or from stdin when no file (or `-`) is given. */
async function readInput(file: string | undefined): Promise<string> {
	if (file && file !== '-') return readFile(file, 'utf8')
	if (process.stdin.isTTY) throw new Error('Pass an HTML file, or pipe the HTML on stdin')
	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
	return Buffer.concat(chunks).toString('utf8')
}

const surfaceHelp = `Surface the HTML is for: ${SURFACES.join(', ')}`

export function htmlCommand() {
	const cmd = new Command('html').description("Check, fix, and list Asana's rich-text rules per surface (no API calls)")

	cmd
		.command('check [file]')
		.description('Report what Asana would refuse or mangle in the HTML (a file, or stdin)')
		.requiredOption('--surface <surface>', surfaceHelp, surfaceOption)
		.action(async (file: string | undefined, opts: { surface: Surface }) => {
			const result = htmlCheckResult(await readInput(file), opts.surface)
			output(result, () => {
				if (result.ok) {
					console.log(`No problems found for ${result.surface}`)
					return
				}
				console.log(`${result.problems.length} problems found for ${result.surface}:`)
				for (const problem of result.problems) console.log(`- ${problem}`)
				printNextSteps([`cyber-asana html fix ${file ?? '-'} --surface ${result.surface}`])
			})
		})

	cmd
		.command('fix [file]')
		.description('Print the HTML normalized for a surface; what it cannot repair goes to stderr')
		.requiredOption('--surface <surface>', surfaceHelp, surfaceOption)
		.action(async (file: string | undefined, opts: { surface: Surface }) => {
			const result = htmlFixResult(await readInput(file), opts.surface)
			output(result, () => {
				console.log(result.html)
				for (const problem of result.problems) console.error(`cannot fix: ${problem}`)
			})
		})

	cmd
		.command('rules')
		.description("Print Asana's HTML subset for one surface, or for every surface")
		.option('--surface <surface>', surfaceHelp, surfaceOption)
		.action((opts: { surface?: Surface }) => {
			const rules = htmlRulesFor(opts.surface)
			output(rules, () => {
				for (const rule of rules) {
					printFields({
						Surface: rule.surface,
						Allowed: rule.allowed.map((t) => `<${t}>`).join(' '),
						Rejected: rule.rejected.map((t) => `<${t}>`).join(' '),
						Unverified: rule.unverified.length ? rule.unverified.map((t) => `<${t}>`).join(' ') : 'none',
						Evidence: rule.evidence,
					})
					for (const message of Object.values(rule.messages)) console.log(`  ${message}`)
				}
			})
		})

	return cmd
}
