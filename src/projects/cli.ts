import { writeFile } from 'node:fs/promises'
import { Command, Option } from 'commander'
import { output, printFields, printTable } from '../output.js'
import {
	createProject,
	deleteProject,
	exportProject,
	getProject,
	listProjects,
	renderProjectMarkdown,
	updateProject,
} from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Project = { gid: string; name: string; permalink_url?: string; color?: string; notes?: string }

function fmtProject(p: Project) {
	printFields({ Name: p.name, ID: p.gid, URL: p.permalink_url, Color: p.color || null, Notes: p.notes || null })
}

function fmtProjectList(projects: Project[]) {
	printTable(projects, [
		{ label: 'Name', get: (p) => p.name },
		{ label: 'ID', get: (p) => p.gid },
	])
}

export function projectCommand() {
	const cmd = new Command('project').description('Manage Asana projects')

	cmd
		.command('list')
		.description('List projects in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			const data = await listProjects(opts.workspace)
			output(data, () => fmtProjectList(data))
		})

	cmd
		.command('get <gid>')
		.description('Get a project by GID')
		.action(async (gid: string) => {
			const data = await getProject(gid)
			output(data, () => fmtProject(data))
		})

	cmd
		.command('create <name>')
		.description('Create a new project')
		.addOption(workspaceOpt())
		.option('--notes <text>', 'Project notes')
		.option('--color <color>', 'Project color')
		.action(async (name: string, opts: { workspace: string; notes?: string; color?: string }) => {
			const data = await createProject(opts.workspace, name, { notes: opts.notes, color: opts.color })
			output(data, () => fmtProject(data))
		})

	cmd
		.command('update <gid>')
		.description('Update a project')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--color <color>', 'New color')
		.action(async (gid: string, opts: { name?: string; notes?: string; color?: string }) => {
			const data = await updateProject(gid, opts)
			output(data, () => fmtProject(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a project')
		.action(async (gid: string) => {
			await deleteProject(gid)
			console.log(`Deleted project ${gid}`)
		})

	cmd
		.command('export <gid>')
		.description('Export a project with all sections and tasks')
		.option('--output <file>', 'Write output to a file instead of stdout')
		.action(async (gid: string, opts: { output?: string }) => {
			const data = await exportProject(gid)
			if (process.argv.includes('--json')) {
				const json = JSON.stringify(data, null, 2)
				if (opts.output) await writeFile(opts.output, json, 'utf-8')
				else console.log(json)
			} else {
				const md = renderProjectMarkdown(data)
				if (opts.output) {
					await writeFile(opts.output, md, 'utf-8')
					console.log(`Wrote ${opts.output}`)
				} else {
					console.log(md)
				}
			}
		})

	return cmd
}
