import type { AuthSession, Credential, Person } from '../application/account-store.ts';
import type { EmailCode } from '../domain/email-code.ts';

const OBJECT_KIND = 'object';
const STRING_KIND = 'string';
const NUMBER_KIND = 'number';
const BOOLEAN_KIND = 'boolean';
const PERSON_FIELDS = ['createdAt', 'email', 'handle', 'id', 'nickname'];
const CREDENTIAL_FIELDS = ['account', 'createdAt', 'credentialId', 'id', 'publicKey'];
const AUTH_SESSION_FIELDS = ['account', 'createdAt', 'deviceLabel', 'id', 'key', 'lastSeenAt'];
const EMAIL_CODE_FIELDS = ['account', 'codeHash', 'expiresAt', 'id'];

type StoredRecord = Readonly<Record<string, unknown>>;

export const isPerson = (value: unknown): value is Person =>
	hasStrings(value, PERSON_FIELDS) && isRecord(value) && isMoment(value.emailVerifiedAt);

export const isCredential = (value: unknown): value is Credential =>
	hasStrings(value, CREDENTIAL_FIELDS) &&
	isRecord(value) &&
	typeof value.backedUp === BOOLEAN_KIND &&
	isMoment(value.lastUsedAt) &&
	typeof value.signCount === NUMBER_KIND &&
	Array.isArray(value.transports) &&
	value.transports.every((transport) => typeof transport === STRING_KIND);

export const isAuthSession = (value: unknown): value is AuthSession =>
	hasStrings(value, AUTH_SESSION_FIELDS) && isRecord(value) && isMoment(value.revokedAt);

export const isEmailCode = (value: unknown): value is EmailCode =>
	hasStrings(value, EMAIL_CODE_FIELDS) && isRecord(value) && isMoment(value.usedAt);

const hasStrings = (value: unknown, fields: readonly string[]): boolean =>
	isRecord(value) && fields.every((field) => typeof value[field] === STRING_KIND);

const isMoment = (value: unknown): boolean => value === null || typeof value === STRING_KIND;

const isRecord = (value: unknown): value is StoredRecord =>
	typeof value === OBJECT_KIND && value !== null;
