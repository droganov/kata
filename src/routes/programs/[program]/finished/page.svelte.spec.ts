import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import { goOffline } from '../../../../test/connection-stub.ts';
import Page from './+page.svelte';

it('говорит, что Занятие завершено, и ведёт к списку Программ', () => {
	render(Page);
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Занятие завершено');
	expect(screen.getByRole('link', { name: 'К Программам' })).toHaveAttribute('href', '/');
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('без связи и после завершения считает неотправленные Отметки', () => {
	goOffline(4);
	render(Page);
	expect(screen.getByRole('status')).toHaveTextContent('Отметки сохраняются на устройстве');
	expect(screen.getByRole('status')).toHaveTextContent('не отправлено 4');
});
