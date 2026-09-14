import { createSession } from '../../../../lib/session/interface/session.ts';

export const GET = ({ params }: { readonly params: { readonly program: string } }): Response =>
	Response.json(createSession().assembleSession(params.program));
