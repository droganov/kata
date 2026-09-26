import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, it } from 'vitest';

const HEADING = '<h1>Тренировка</h1>';

import Layout from './+layout.svelte';

const children = createRawSnippet(() => ({ render: () => HEADING }));

it('раскладка рендерит детей', () => {
	render(Layout, { children, data: { hasExpiredSession: false } });
	expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('сообщает, что Занятие закрылось само', () => {
	render(Layout, { children, data: { hasExpiredSession: true } });
	expect(screen.getByRole('status')).toHaveTextContent('Занятие закрылось само');
});
