const config = {
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	printWidth: 100,
	singleQuote: true,
	tailwindStylesheet: './src/routes/layout.css',
	trailingComma: 'none',
	useTabs: true
};

export default config;
