const EMAIL = /^[^\s@]+@[^\s@]+$/;
const EMPTY_NICKNAME = 'Никнейм пуст';
const INVALID_EMAIL = 'Почта не похожа на почту: ';
const INVALID_EMAIL_NAME = 'InvalidEmailError';
const INVALID_NICKNAME_NAME = 'InvalidNicknameError';

export const HANDLE_BYTES = 64;

export interface Person {
	readonly createdAt: string;
	readonly email: string;
	readonly emailVerifiedAt: null | string;
	readonly handle: string;
	readonly id: string;
	readonly nickname: string;
}

export class InvalidEmailError extends Error {
	override readonly name = INVALID_EMAIL_NAME;

	constructor(email: string) {
		super(INVALID_EMAIL + email);
	}
}

export class InvalidNicknameError extends Error {
	override readonly name = INVALID_NICKNAME_NAME;

	constructor() {
		super(EMPTY_NICKNAME);
	}
}

export const emailOf = (text: string): string => {
	const email = text.trim().toLowerCase();
	if (!EMAIL.test(email)) throw new InvalidEmailError(text);
	return email;
};

export const nicknameOf = (text: string): string => {
	const nickname = text.trim();
	if (nickname === '') throw new InvalidNicknameError();
	return nickname;
};
