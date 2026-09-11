import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const BROWSER_CONDITION = 'browser';

const isLibrary = (filename: string): boolean => filename.split(/[/\\]/).includes('node_modules');

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			compilerOptions: { runes: ({ filename }) => (isLibrary(filename) ? undefined : true) }
		})
	],
	test: {
		coverage: {
			exclude: ['src/**/*.d.ts', 'src/**/*.spec.ts', 'src/test/**'],
			include: ['src/**/*.ts', 'src/**/*.svelte'],
			provider: 'v8',
			reporter: ['text', 'html'],
			thresholds: {
				'**/*.svelte': { branches: 67, functions: 100, lines: 100, statements: 100 },
				'**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 }
			}
		},
		projects: [
			{
				extends: true,
				test: {
					environment: 'node',
					exclude: ['src/**/*.svelte.spec.ts'],
					include: ['src/**/*.spec.ts'],
					name: 'unit'
				}
			},
			{
				extends: true,
				resolve: { conditions: [BROWSER_CONDITION] },
				test: {
					environment: 'happy-dom',
					include: ['src/**/*.svelte.spec.ts'],
					name: 'component',
					setupFiles: ['./src/test/component-setup.ts']
				}
			}
		]
	}
});
