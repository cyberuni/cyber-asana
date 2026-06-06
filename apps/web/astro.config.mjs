import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	integrations: [
		starlight({
			title: 'cyber-asana',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/cyberuni/cyber-asana',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', link: '/' },
						{ label: 'Getting Started', link: '/getting-started/' },
					],
				},
				{
					label: 'CLI',
					items: [{ autogenerate: { directory: 'cli' } }],
				},
				{
					label: 'MCP',
					items: [{ autogenerate: { directory: 'mcp' } }],
				},
				{
					label: 'Skills',
					items: [{ autogenerate: { directory: 'skills' } }],
				},
			],
			editLink: {
				baseUrl: 'https://github.com/cyberuni/cyber-asana/edit/main/apps/web/',
			},
		}),
	],
})
