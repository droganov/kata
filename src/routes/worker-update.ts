export interface WorkerContainer {
	readonly addEventListener: (type: string, listener: () => void) => void;
	readonly controller: unknown;
	readonly getRegistration: () => Promise<undefined | WorkerRegistration>;
}

export interface WorkerPage {
	readonly container: undefined | WorkerContainer;
	readonly document: {
		readonly addEventListener: (type: string, listener: () => void) => void;
		readonly visibilityState: string;
	};
	readonly reload: () => void;
}

interface WorkerRegistration {
	readonly update: () => Promise<unknown>;
}

const CONTROLLER_CHANGE = 'controllerchange';
const VISIBILITY_CHANGE = 'visibilitychange';
const VISIBLE = 'visible';

const checkForUpdate = async (container: WorkerContainer): Promise<void> => {
	try {
		const registration = await container.getRegistration();
		await registration?.update();
	} catch {
		return;
	}
};

export const followWorkerUpdates = ({ container, document, reload }: WorkerPage): void => {
	if (container === undefined) return;
	const isHadController = container.controller !== null;
	container.addEventListener(CONTROLLER_CHANGE, () => {
		if (isHadController) reload();
	});
	document.addEventListener(VISIBILITY_CHANGE, () => {
		if (document.visibilityState === VISIBLE) void checkForUpdate(container);
	});
};
