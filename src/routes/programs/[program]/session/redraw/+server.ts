import {
	createSession,
	historyOf,
	NOTHING_TO_REDRAW,
	redrawOf
} from '../../../../../lib/session/interface/session.ts';

const BAD_REQUEST = 400;

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
	const body = await bodyOf(request);
	const redraw = redrawOf(body);
	if (redraw === undefined) return new Response(null, { status: BAD_REQUEST });
	const item = createSession().redrawSessionItemView(params.program, historyOf(body), redraw);
	return item === undefined
		? new Response(null, { status: NOTHING_TO_REDRAW })
		: Response.json(item);
};
