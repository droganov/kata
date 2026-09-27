import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { SIGNED_IN } from '../../test/account-fixtures.ts';
import Page from './+page.svelte';

describe('экран Аккаунта', () => {
	it('показывает никнейм и почту Аккаунта', () => {
		render(Page, { data: { signedIn: SIGNED_IN } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Аккаунт');
		expect(screen.getByText('Sergei')).toBeInTheDocument();
		expect(screen.getByText('sergei@example.com')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Программы' })).toHaveAttribute('href', '/');
	});

	it('без Сеанса вместо экрана показывает форму Входа', () => {
		render(Page, { data: { signedIn: undefined } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вход');
	});
});
