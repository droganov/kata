import { createSession, historyOf } from '../../../../lib/session/interface/session.ts';

const bodyOf = async (request: Request): Promise<unknown> => {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
};

export const POST = async ({
	params,
	request
}: {
	readonly params: { readonly program: string };
	readonly request: Request;
}): Promise<Response> => {
	const history = historyOf(await bodyOf(request));
	return Response.json(createSession().assembleSession(params.program, history));
};
