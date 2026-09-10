import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const isLibrary = (filename: string): boolean => filename.split(/[/\\]/).includes('node_modules');

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter({ fallback: 'index.html' }),
			compilerOptions: { runes: ({ filename }) => (isLibrary(filename) ? undefined : true) }
		})
	],
	test: {
		coverage: {
			exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/test/**'],
			include: ['src/**/*.ts', 'src/**/*.svelte'],
			provider: 'v8',
			reporter: ['text', 'html'],
			thresholds: {
				'**/*.svelte': { branches: 78, functions: 100, lines: 100, statements: 100 },
				'**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 }
			}
		},
		projects: [
			{
				extends: true,
				test: {
					environment: 'node',
					exclude: ['src/**/*.svelte.test.ts'],
					include: ['src/**/*.test.ts'],
					name: 'unit'
				}
			},
			{
				extends: true,
				test: {
					browser: {
						enabled: true,
						headless: true,
						instances: [{ browser: 'chromium' }],
						provider: playwright()
					},
					include: ['src/**/*.svelte.test.ts'],
					name: 'browser',
					setupFiles: ['./src/test/browser-setup.ts']
				}
			}
		]
	}
});
