import { closeExpiredBrowserSessions } from '../lib/session/interface/browser-session.ts';

export const ssr = false;

export const load = async (): Promise<{ readonly hasExpiredSession: boolean }> => {
	const expired = await closeExpiredBrowserSessions();
	return { hasExpiredSession: expired.length > 0 };
};
