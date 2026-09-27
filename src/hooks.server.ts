import { builtWorker, WORKER_PATH } from './routes/built-worker.ts';

interface Handled<Event> {
	readonly event: Event;
	readonly resolve: (event: Event) => Promise<Response> | Response;
}

export const handle = <Event extends { readonly url: URL }>({
	event,
	resolve
}: Handled<Event>): Promise<Response> | Response =>
	event.url.pathname === WORKER_PATH ? builtWorker() : resolve(event);
