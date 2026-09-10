export default {
	extends: ['stylelint-config-standard', 'stylelint-config-html/svelte'],
	rules: {
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: [
					'plugin',
					'theme',
					'apply',
					'source',
					'variant',
					'custom-variant',
					'utility',
					'config'
				]
			}
		],
		'import-notation': null,
		'comment-word-disallowed-list': [[/./], { message: 'Комментарии запрещены' }]
	}
};
