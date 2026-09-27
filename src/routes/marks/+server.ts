import { MARKS_DELIVERED, sentMarksOf } from '../../lib/session/interface/session.ts';

const BAD_REQUEST = 400;

const bodyOf = async (request: Request): Promise<unknown> => {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
};

export const POST = async ({ request }: { readonly request: Request }): Promise<Response> =>
	new Response(null, {
		status: sentMarksOf(await bodyOf(request)) === undefined ? BAD_REQUEST : MARKS_DELIVERED
	});
