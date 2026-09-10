import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import checkFile from 'eslint-plugin-check-file';
import importX from 'eslint-plugin-import-x';
import perfectionist from 'eslint-plugin-perfectionist';
import promise from 'eslint-plugin-promise';
import regexp from 'eslint-plugin-regexp';
import sonarjs from 'eslint-plugin-sonarjs';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import path from 'node:path';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

const SVELTE_FILES = ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'];
const ROUTE_LOAD_FILES = ['src/routes/**/+page.ts', 'src/routes/**/+layout.ts'];
const TEST_FILES = ['src/**/*.test.ts'];
const CONFIG_FILES = ['*.config.{js,ts}', 'eslint.config.js'];
const SVELTEKIT_EXPORT_NAMES = '^(ssr|csr|prerender|trailingSlash|load|actions|entries|config)$';

const LAYERS = [
	{ type: 'domain', pattern: 'src/lib/domain' },
	{ type: 'application', pattern: 'src/lib/application' },
	{ type: 'infrastructure', pattern: 'src/lib/infrastructure' },
	{ type: 'ui', pattern: 'src/lib/ui' },
	{ type: 'assets', pattern: 'src/lib/assets' },
	{ type: 'routes', pattern: 'src/routes' },
	{ type: 'test-support', pattern: 'src/test' }
];

const FILE_CATEGORIES = [
	{ category: 'test', pattern: TEST_FILES },
	{ category: 'route-load', pattern: ROUTE_LOAD_FILES },
	{ category: 'route-view', pattern: 'src/routes/**/*.svelte' },
	{ category: 'route-style', pattern: 'src/routes/**/*.css' },
	{ category: 'app', pattern: ['src/app.d.ts', 'src/app.html'] }
];

const toLayers = (...types) => [{ to: { element: { types: { anyOf: types } } } }];
const toFiles = (category) => ({ to: { file: { categories: category } } });

const DEPENDENCY_POLICIES = [
	{ from: { element: { type: 'domain' } }, allow: toLayers('domain') },
	{ from: { element: { type: 'application' } }, allow: toLayers('domain', 'application') },
	{
		from: { element: { type: 'infrastructure' } },
		allow: toLayers('domain', 'application', 'infrastructure')
	},
	{ from: { element: { type: 'ui' } }, allow: toLayers('domain', 'application', 'ui', 'assets') },
	{
		from: { file: { categories: 'route-load' } },
		allow: toLayers('domain', 'application', 'infrastructure')
	},
	{
		from: { file: { categories: 'route-view' } },
		allow: [
			...toLayers('domain', 'application', 'ui', 'assets'),
			toFiles('route-style'),
			toFiles('route-load')
		]
	},
	{
		from: { file: { categories: 'test' } },
		allow: toLayers('domain', 'application', 'infrastructure', 'ui', 'routes', 'test-support')
	},
	{
		from: { element: { type: 'test-support' } },
		allow: toLayers('routes', 'domain', 'application', 'ui')
	},
	{ disallow: toFiles('test') }
];

const NAMING = [
	{
		format: ['camelCase'],
		leadingUnderscore: 'forbid',
		selector: 'default',
		trailingUnderscore: 'forbid'
	},
	{ format: ['camelCase', 'PascalCase'], selector: 'import' },
	{
		filter: { match: true, regex: SVELTEKIT_EXPORT_NAMES },
		format: null,
		modifiers: ['exported'],
		selector: 'variable'
	},
	{ format: ['camelCase'], selector: 'variable' },
	{ format: ['camelCase', 'UPPER_CASE'], modifiers: ['const', 'global'], selector: 'variable' },
	{
		format: ['PascalCase'],
		prefix: ['is', 'has', 'can', 'should', 'did'],
		selector: 'variable',
		types: ['boolean']
	},
	{ format: ['camelCase'], selector: 'function' },
	{ format: ['camelCase'], selector: 'parameter' },
	{ format: ['PascalCase'], selector: 'typeLike' },
	{ custom: { match: false, regex: '^I[A-Z]' }, format: ['PascalCase'], selector: 'interface' },
	{ format: ['PascalCase'], selector: 'enumMember' },
	{ format: null, selector: 'objectLiteralProperty' },
	{ format: null, selector: 'typeProperty' }
];

const MODULE_SCOPE_OWNERS = new Set(['ExportNamedDeclaration', 'Program', 'SvelteScriptElement']);
const SCOPE_BOUNDARIES = new Set([
	'ArrowFunctionExpression',
	'BlockStatement',
	'FunctionDeclaration'
]);
const DECLARATIVE_PARENTS = new Set([
	'ExportAllDeclaration',
	'ExportNamedDeclaration',
	'ImportAttribute',
	'ImportDeclaration',
	'TSEnumMember',
	'TSLiteralType'
]);

const isModuleScopeConstInitializer = (node) => {
	let current = node;
	while (current.parent) {
		const { parent } = current;
		if (parent.type === 'VariableDeclarator' && parent.init === current) {
			const declaration = parent.parent;
			return declaration.kind === 'const' && MODULE_SCOPE_OWNERS.has(declaration.parent.type);
		}
		if (SCOPE_BOUNDARIES.has(parent.type)) return false;
		current = parent;
	}
	return false;
};

const isDeclarativePosition = (node) => {
	const { parent } = node;
	if (DECLARATIVE_PARENTS.has(parent.type)) return true;
	if (parent.type === 'Property' && parent.key === node && !parent.computed) return true;
	return parent.type === 'ExpressionStatement' && parent.directive !== undefined;
};

const noMagicStrings = {
	meta: {
		type: 'problem',
		messages: { magic: 'Строка-литерал вне константы модуля: вынеси в const с именем' }
	},
	create(context) {
		return {
			Literal(node) {
				if (typeof node.value !== 'string' || node.value === '') return;
				if (isDeclarativePosition(node) || isModuleScopeConstInitializer(node)) return;
				context.report({ messageId: 'magic', node });
			}
		};
	}
};

const selfDescribingCode = {
	rules: {
		'no-magic-strings': noMagicStrings,
		'no-comments': {
			meta: {
				type: 'problem',
				messages: {
					forbidden: 'Комментарии запрещены: имя и структура кода объясняют его сами'
				}
			},
			create(context) {
				const report = (loc) => {
					context.report({ loc, messageId: 'forbidden' });
				};
				return {
					Program() {
						for (const comment of context.sourceCode.getAllComments())
							report(comment.loc);
					},
					SvelteHTMLComment(node) {
						report(node.loc);
					}
				};
			}
		}
	}
};

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['static/**', 'data/**', 'tools/**', 'tests/**', 'schema/**', 'coverage/**'] },

	js.configs.recommended,
	ts.configs.strictTypeChecked,
	ts.configs.stylisticTypeChecked,
	svelte.configs.recommended,
	unicorn.configs.recommended,
	sonarjs.configs.recommended,
	regexp.configs['flat/recommended'],
	promise.configs['flat/recommended'],
	importX.flatConfigs.recommended,
	importX.flatConfigs.typescript,
	perfectionist.configs['recommended-natural'],
	prettier,
	svelte.configs.prettier,

	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				extraFileExtensions: ['.svelte'],
				projectService: { allowDefaultProject: CONFIG_FILES },
				tsconfigRootDir: import.meta.dirname
			}
		},
		plugins: { boundaries, 'check-file': checkFile, local: selfDescribingCode },
		settings: {
			'boundaries/elements': LAYERS,
			'boundaries/files': FILE_CATEGORIES,
			'boundaries/ignore': CONFIG_FILES,
			'import-x/resolver': { typescript: { project: './tsconfig.json' } },
			'import/resolver': { typescript: { project: './tsconfig.json' } }
		},
		rules: {
			'local/no-comments': 'error',
			'local/no-magic-strings': 'error',
			'@typescript-eslint/no-magic-numbers': [
				'error',
				{
					detectObjects: false,
					enforceConst: true,
					ignore: [-1, 0, 1, 2],
					ignoreArrayIndexes: true,
					ignoreTypeIndexes: true
				}
			],
			'no-console': 'error',
			'no-undef': 'off',

			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ fixStyle: 'inline-type-imports' }
			],
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{ allowExpressions: true }
			],
			'@typescript-eslint/naming-convention': ['error', ...NAMING],
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',

			'check-file/filename-naming-convention': [
				'error',
				{ 'src/**/!(+*).{ts,js,svelte,css}': 'KEBAB_CASE' },
				{ ignoreMiddleExtensions: true }
			],
			'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE' }],
			'check-file/no-index': 'error',

			'boundaries/dependencies': [
				'error',
				{ default: 'disallow', policies: DEPENDENCY_POLICIES }
			],
			'boundaries/no-unknown-dependencies': 'error',
			'boundaries/no-unknown-files': 'error',

			'import-x/no-cycle': 'error',
			'import-x/no-default-export': 'error',
			'import-x/no-named-as-default-member': 'off',
			'import-x/no-unresolved': 'off',
			'import-x/order': 'off',

			'sonarjs/cognitive-complexity': ['error', 12],
			'sonarjs/no-duplicate-string': 'off',

			'unicorn/filename-case': 'off',
			'unicorn/name-replacements': 'off',
			'unicorn/no-array-reduce': 'off',
			'unicorn/no-null': 'off',
			'unicorn/prefer-top-level-await': 'off',
			'unicorn/prevent-abbreviations': 'off'
		}
	},

	{
		files: SVELTE_FILES,
		languageOptions: { parserOptions: { parser: ts.parser } },
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'sonarjs/no-use-of-empty-return-value': 'off',
			'svelte/block-lang': ['error', { script: 'ts' }],
			'svelte/button-has-type': 'error',
			'svelte/no-at-html-tags': 'error',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/no-unused-svelte-ignore': 'error',
			'svelte/no-useless-mustaches': 'error',
			'svelte/prefer-const': 'error',
			'svelte/require-each-key': 'error',
			'svelte/sort-attributes': 'error',
			'svelte/valid-compile': 'error',
			'unicorn/no-top-level-assignment-in-function': 'off'
		}
	},

	{
		extends: [ts.configs.disableTypeChecked],
		files: CONFIG_FILES,
		rules: {
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-magic-numbers': 'off',
			'local/no-magic-strings': 'off',
			'import-x/no-default-export': 'off',
			'import-x/no-named-as-default': 'off',
			'perfectionist/sort-objects': 'off'
		}
	},

	{
		files: ROUTE_LOAD_FILES,
		rules: { 'unicorn/consistent-boolean-name': 'off' }
	},

	{
		files: TEST_FILES,
		plugins: { vitest },
		rules: {
			...vitest.configs.recommended.rules,
			'@typescript-eslint/no-magic-numbers': 'off',
			'local/no-magic-strings': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'vitest/expect-expect': 'error',
			'vitest/no-disabled-tests': 'error',
			'vitest/no-focused-tests': 'error'
		}
	}
);
