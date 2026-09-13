const SEED_BYTES = 4;

export const cryptoSeed = (): number =>
	new DataView(crypto.getRandomValues(new Uint8Array(SEED_BYTES)).buffer).getUint32(0);
