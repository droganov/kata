import { invalidateAll } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SignIn from './sign-in.svelte';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));

const NO_CONTENT = 204;

const fillIn = async (label: string, value: string): Promise<void> => {
	await fireEvent.input(screen.getByLabelText(label), { target: { value } });
};

const requestCode = async (): Promise<void> => {
	await fillIn('Никнейм', 'Sergei');
	await fillIn('Почта', 'Sergei@Example.com');
	await fireEvent.submit(screen.getByRole('button', { name: 'Получить код' }));
	await screen.findByText('Код подтверждения отправлен на sergei@example.com.');
};

describe('форма Входа', () => {
	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: NO_CONTENT })))
		);
		vi.mocked(invalidateAll).mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('спрашивает никнейм и почту и предупреждает, что Аккаунт живёт в связке ключей', () => {
		render(SignIn);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вход');
		expect(screen.getByLabelText('Никнейм')).toBeRequired();
		expect(screen.getByLabelText('Почта')).toHaveAttribute('type', 'email');
		expect(screen.getByRole('note')).toHaveTextContent(
			'Потеря связки ключей означает потерю Аккаунта'
		);
	});

	it('запрашивает код, принимает любой и входит: сервер ставит куку, раскладка перечитывается', async () => {
		render(SignIn);
		await requestCode();
		await fillIn('Код', '424242');
		await fireEvent.submit(screen.getByRole('button', { name: 'Создать ключ и войти' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(fetch).toHaveBeenCalledWith(
			'/auth/session',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('показывает предметную ошибку, когда почта не похожа на почту', async () => {
		render(SignIn);
		await fillIn('Никнейм', 'Sergei');
		await fillIn('Почта', 'sergei');
		await fireEvent.submit(screen.getByRole('button', { name: 'Получить код' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Почта не похожа на почту');
	});

	it('второй раз тем же кодом не входит и просит новый', async () => {
		render(SignIn);
		await requestCode();
		await fillIn('Код', '1');
		await fireEvent.submit(screen.getByRole('button', { name: 'Создать ключ и войти' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalledOnce();
		});
		await fireEvent.submit(screen.getByRole('button', { name: 'Создать ключ и войти' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Код не подошёл или истёк');
	});

	it('показывает отказ сервера поставить куку', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 400 })));
		render(SignIn);
		await requestCode();
		await fireEvent.submit(screen.getByRole('button', { name: 'Создать ключ и войти' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Сервер не запомнил Сеанс');
	});

	it('возвращает к вводу другой почты', async () => {
		render(SignIn);
		await requestCode();
		await fireEvent.click(screen.getByRole('button', { name: 'Другая почта' }));
		expect(screen.getByLabelText('Почта')).toBeInTheDocument();
		expect(screen.queryByLabelText('Код')).not.toBeInTheDocument();
	});
});
