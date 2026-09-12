export const EXIT_MESSAGE = 'process.exit';

export const exitStub = (codes: number[]): ((code?: null | number | string) => never) => {
	const exit = (code?: null | number | string): never => {
		codes.push(Number(code ?? 0));
		throw new Error(EXIT_MESSAGE);
	};
	return exit;
};
