import type { User } from '../domain/program.ts';

export interface UserRepository {
	readAll: () => readonly User[];
}
