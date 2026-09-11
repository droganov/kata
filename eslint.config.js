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
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

const SVELTE_FILES = ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'];
const ROUTE_LOAD_FILES = [
	'src/routes/**/+page.ts',
	'src/routes/**/+page.server.ts',
	'src/routes/**/+layout.ts',
	'src/routes/**/+layout.server.ts',
	'src/routes/**/+server.ts'
];
const TEST_FILES = ['src/**/*.spec.ts'];
const TEST_SUPPORT_FILES = ['src/test/**/*.ts'];
const SPEC_SUFFIX = '.spec.ts';
const TEST_NAME_PATTERN = /\.test\.[cm]?[jt]sx?$/;
const CONFIG_FILES = ['*.config.{js,ts}', 'eslint.config.js'];
const SVELTEKIT_EXPORT_NAMES = '^(ssr|csr|prerender|trailingSlash|load|actions|entries|config)$';

const CAPSULES = ['program', 'exercise', 'catalog', 'storyboard'];
const LAYERS = ['domain', 'application', 'infrastructure', 'interface'];
const SHARED_KERNEL_MAX_FILES = 8;
const group = (names) => `(${names.join('|')})`;

const ELEMENTS = [
	{
		type: 'layer',
		pattern: `src/lib/${group(CAPSULES)}/${group(LAYERS)}`,
		capture: ['capsule', 'layer']
	},
	{ type: 'shared', pattern: 'src/lib/shared' },
	{ type: 'routes', pattern: 'src/routes' },
	{ type: 'test-support', pattern: 'src/test' }
];

const FILE_CATEGORIES = [
	{ category: 'test', pattern: TEST_FILES },
	{ category: 'app', pattern: ['src/app.d.ts', 'src/app.html'] }
];

const sameCapsuleLayers = (...layers) => ({
	to: {
		element: {
			type: 'layer',
			captured: { capsule: '{{ from.element.captured.capsule }}', layer: layers }
		}
	}
});
const otherCapsuleApplication = {
	to: {
		element: {
			type: 'layer',
			captured: {
				capsule: '!{{ from.element.captured.capsule }}',
				layer: 'application'
			}
		}
	}
};
const anyCapsuleLayers = (...layers) => ({
	to: { element: { type: 'layer', captured: { layer: layers } } }
});
const toShared = { to: { element: { type: 'shared' } } };
const fromLayer = (layer) => ({ element: { type: 'layer', captured: { layer } } });

const DEPENDENCY_POLICIES = [
	{ from: fromLayer('domain'), allow: [sameCapsuleLayers('domain'), toShared] },
	{
		from: fromLayer('application'),
		allow: [sameCapsuleLayers('domain', 'application'), otherCapsuleApplication, toShared]
	},
	{
		from: fromLayer('infrastructure'),
		allow: [
			sameCapsuleLayers('domain', 'application', 'infrastructure'),
			otherCapsuleApplication,
			toShared
		]
	},
	{
		from: fromLayer('interface'),
		allow: [
			sameCapsuleLayers('domain', 'application', 'infrastructure', 'interface'),
			otherCapsuleApplication,
			toShared
		]
	},
	{ from: { element: { type: 'shared' } }, allow: [toShared] },
	{
		from: { element: { type: 'routes' } },
		allow: [
			anyCapsuleLayers('application', 'interface'),
			toShared,
			{ to: { element: { type: 'routes' } } }
		]
	},
	{
		from: { element: { type: 'test-support' } },
		allow: [
			{ to: { element: { type: 'layer' } } },
			toShared,
			{ to: { element: { type: 'routes' } } }
		]
	},
	{
		from: { file: { categories: 'test' } },
		allow: [
			{ to: { element: { type: 'layer' } } },
			toShared,
			{ to: { element: { type: 'routes' } } },
			{ to: { element: { type: 'test-support' } } }
		]
	},
	{ disallow: { to: { file: { categories: 'test' } } } }
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

const DOMAIN_PUBLIC_API = {
	catalog: [
		'Bank',
		'BankSlug',
		'Catalog',
		'Equipment',
		'EquipmentKind',
		'Finding',
		'Target',
		'TargetGroup',
		'TargetKind',
		'bankRecords',
		'rulesForBank'
	],
	exercise: [
		'CorePlane',
		'EquipmentRef',
		'Exercise',
		'ExerciseConstraints',
		'ExerciseGoal',
		'ExerciseMode',
		'ExerciseRecord',
		'Finding',
		'HipPlane',
		'Oracle',
		'Procedure',
		'Source',
		'Step',
		'TargetRef',
		'Verdict',
		'counterLineKey',
		'exerciseInvariants',
		'exerciseIssues',
		'exerciseSubject',
		'findingsOf',
		'independentHashesOf',
		'mainEquipmentIdsOf',
		'mergeVerdicts',
		'sourceIdsOf',
		'stepPredicatesOf',
		'verdictHashText'
	],
	program: [
		'Finding',
		'PlanExercise',
		'PlanExercises',
		'PlanTarget',
		'Program',
		'Session',
		'User',
		'ContourLocator',
		'SectionOutline',
		'SlotOutline',
		'programPlanOf',
		'rulesForProgram',
		'sectionOutlinesOf',
		'sessionsOf'
	],
	storyboard: ['Prompt', 'PromptCatalog', 'promptOf']
};

const LIB_ALIAS = '$lib/';
const DOMAIN_PATH = /src\/lib\/(?<capsule>[a-z]+)\/domain(?:\/|$)/;

const domainCapsuleOf = (absolutePath) => DOMAIN_PATH.exec(absolutePath)?.groups?.capsule;

const resolveImport = (importerPath, source) => {
	if (source.startsWith(LIB_ALIAS))
		return path.join(import.meta.dirname, 'src/lib', source.slice(LIB_ALIAS.length));
	return source.startsWith('.') ? path.resolve(path.dirname(importerPath), source) : null;
};

const aggregateRootOnly = {
	meta: {
		type: 'problem',
		messages: {
			namespace:
				'Из domain капсулы «{{capsule}}» снаружи нельзя брать всё: только корни агрегатов из манифеста',
			hidden: '«{{name}}» не входит в публичный API domain капсулы «{{capsule}}» (DOMAIN_PUBLIC_API)'
		}
	},
	create(context) {
		const importer = context.filename;
		const importerCapsule = domainCapsuleOf(importer);
		return {
			ImportDeclaration(node) {
				const target = resolveImport(importer, node.source.value);
				if (target === null) return;
				const capsule = domainCapsuleOf(target);
				if (capsule === undefined || capsule === importerCapsule) return;
				const allowed = new Set(DOMAIN_PUBLIC_API[capsule]);
				for (const specifier of node.specifiers) {
					if (specifier.type !== 'ImportSpecifier') {
						context.report({
							data: { capsule },
							messageId: 'namespace',
							node: specifier
						});
						continue;
					}
					const name = specifier.imported.name ?? specifier.imported.value;
					if (!allowed.has(name))
						context.report({
							data: { capsule, name },
							messageId: 'hidden',
							node: specifier
						});
				}
			}
		};
	}
};

const SHARED_DIR = path.join(import.meta.dirname, 'src/lib/shared');
const countSourceFiles = (dir) =>
	fs
		.readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && !entry.name.endsWith(SPEC_SUFFIX)).length;

const sharedKernelSmall = {
	meta: {
		type: 'problem',
		messages: {
			tooBig: 'Shared kernel: {{count}} файлов, лимит {{max}} — «Keep this kernel small»'
		}
	},
	create(context) {
		if (!context.filename.startsWith(SHARED_DIR)) return {};
		return {
			Program(node) {
				const count = countSourceFiles(SHARED_DIR);
				if (count > SHARED_KERNEL_MAX_FILES) {
					context.report({
						data: { count, max: SHARED_KERNEL_MAX_FILES },
						messageId: 'tooBig',
						node
					});
				}
			}
		};
	}
};

const sourceCandidates = (base) => [
	`${base}.ts`,
	`${base}.svelte`,
	base,
	`+${base}.ts`,
	`+${base}.svelte`,
	`+${base}`
];

const specBesideSource = {
	meta: {
		type: 'problem',
		messages: {
			orphan: 'Рядом с {{name}} нет проверяемого файла: тест лежит рядом с тем, что проверяет',
			wrongName: 'Тест назван {{name}}: имя теста это <проверяемый файл>.spec.ts'
		}
	},
	create(context) {
		const name = path.basename(context.filename);
		return {
			Program(node) {
				if (TEST_NAME_PATTERN.test(name)) {
					context.report({ data: { name }, messageId: 'wrongName', node });
					return;
				}
				if (!name.endsWith(SPEC_SUFFIX)) return;
				const directory = path.dirname(context.filename);
				const base = name.slice(0, -SPEC_SUFFIX.length);
				const beside = sourceCandidates(base).some((candidate) =>
					fs.existsSync(path.join(directory, candidate))
				);
				if (!beside) context.report({ data: { name }, messageId: 'orphan', node });
			}
		};
	}
};

const selfDescribingCode = {
	rules: {
		'aggregate-root-only': aggregateRootOnly,
		'shared-kernel-small': sharedKernelSmall,
		'spec-beside-source': specBesideSource,
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
	{
		ignores: ['static/**', 'data/**', 'schema/**', 'coverage/**']
	},

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
			'boundaries/elements': ELEMENTS,
			'boundaries/files': FILE_CATEGORIES,
			'boundaries/ignore': CONFIG_FILES,
			'import-x/resolver': { typescript: { project: './tsconfig.json' } },
			'import/resolver': { typescript: { project: './tsconfig.json' } }
		},
		rules: {
			'local/aggregate-root-only': 'error',
			'local/shared-kernel-small': 'error',
			'local/spec-beside-source': 'error',
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

			'regexp/no-obscure-range': ['error', { allowed: ['alphanumeric', 'а-я', 'А-Я'] }],
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
		files: ['src/lib/*/interface/cli/**'],
		rules: { 'no-console': 'off', 'unicorn/no-process-exit': 'off' }
	},

	{
		files: [...TEST_FILES, ...TEST_SUPPORT_FILES],
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
