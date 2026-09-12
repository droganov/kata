import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { EquipmentRepository } from '../../catalog/application/equipment-repository.ts';
import type { TargetRepository } from '../../catalog/application/target-repository.ts';
import type { CatalogGateway } from '../application/catalog-gateway.ts';
import type {
	SourceCatalog,
	SourceDocument,
	SourceEquipment,
	SourceExercise,
	SourceFile,
	SourceOutsideGym,
	SourcePerson,
	SourceProgram,
	SourceReference,
	SourceStep,
	SourceTarget,
	SourceVerdict
} from '../domain/source-catalog.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { findEquipment } from '../../catalog/application/find-equipment.ts';
import { findTargets } from '../../catalog/application/find-targets.ts';
import { readJsonArray, readJsonFile } from './json-file.ts';

const BANK_SCHEMA_ID = 'bank.schema.json';
const EQUIPMENT_SCHEMA_ID = 'equipment.schema.json';
const PROGRAM_SCHEMA_ID = 'program.schema.json';
const SOURCE_SCHEMA_ID = 'source.schema.json';
const TARGET_SCHEMA_ID = 'target.schema.json';
const USER_SCHEMA_ID = 'user.schema.json';
const VERDICT_SCHEMA_ID = 'verdict.schema.json';
const JSON_SUFFIX = '.json';
const ITEM_MARK = '#';
const FILE_ORDER: readonly string[] = ['cardio', 'warmup', 'strength', 'calisthenics', 'stretch'];
const WALKING = 'walking';
const MOBILITY_HOME = 'mobility_home';
const DOCUMENT_KIND = {
	banks: 'banks',
	equipment: 'equipment',
	programs: 'programs',
	sources: 'sources',
	targets: 'targets',
	users: 'users',
	verdicts: 'verdicts'
} as const;

export interface CatalogJsonSource {
	readonly equipmentFile: string;
	readonly modalityDirectory: string;
	readonly programsFile: string;
	readonly referencesFile: string;
	readonly targetsFile: string;
	readonly usersFile: string;
	readonly validator: SchemaValidator;
	readonly verdictsFile: string;
}

type CatalogEquipment = ReturnType<EquipmentRepository['readAll']>[number];

interface CatalogFile {
	readonly excluded?: readonly { readonly name: string; readonly reason: string }[];
	readonly id: string;
	readonly rules: readonly string[];
	readonly session_budget_sec?: number;
	readonly slug: string;
	readonly title: string;
	readonly zones: readonly CatalogFileZone[];
}

interface CatalogFileContour {
	readonly exercises: readonly CatalogFileExercise[];
	readonly id: string;
	readonly pick?: number;
	readonly slug: string;
	readonly title: string;
}

interface CatalogFileExercise {
	readonly constraints: {
		readonly axial: boolean;
		readonly free_weight: boolean;
		readonly kg_max?: number;
		readonly lumbar_ext: boolean;
		readonly lumbar_flex: boolean;
	};
	readonly dose: string;
	readonly equipment: readonly { id: string; role: string }[];
	readonly goal?: string;
	readonly hip_plane?: string;
	readonly id: string;
	readonly met?: number;
	readonly mode: string;
	readonly name: string;
	readonly note?: string;
	readonly plane?: string;
	readonly procedure: CatalogFileProcedure;
	readonly seconds?: number;
	readonly slug: string;
	readonly source: string;
	readonly targets: readonly { id: string; role: string }[];
}

interface CatalogFileOracle {
	readonly counterModel: readonly string[];
	readonly id: string;
	readonly model: readonly string[];
	readonly predicate: string;
}

interface CatalogFileProcedure {
	readonly id: string;
	readonly steps: readonly CatalogFileStep[];
}

interface CatalogFileStep {
	readonly active: readonly string[];
	readonly id: string;
	readonly oracles: readonly CatalogFileOracle[];
	readonly title: string;
}

interface CatalogFileZone {
	readonly contours: readonly CatalogFileContour[];
	readonly id: string;
	readonly rule?: string;
	readonly slug: string;
	readonly title: string;
}

type CatalogTarget = ReturnType<TargetRepository['readAll']>[number];

interface ProgramFile {
	readonly contraindications: {
		readonly axial_load: boolean;
		readonly free_weight_kg_max: number;
		readonly loaded_lumbar_extension: boolean;
		readonly loaded_lumbar_flexion: boolean;
	};
	readonly goals: { readonly primary: readonly string[]; readonly secondary: readonly string[] };
	readonly hip_planes?: readonly string[];
	readonly id: string;
	readonly outside_gym?: {
		readonly mobility_home?: {
			readonly days_per_week: number;
			readonly min_per_day: number;
			readonly name: string;
		};
		readonly walking?: {
			readonly intensity: string;
			readonly min_per_session: number;
			readonly name: string;
			readonly sessions_per_week: number;
		};
	};
	readonly pairing?: readonly { readonly exercises: readonly string[]; readonly slot: string }[];
	readonly progression: {
		readonly base: string;
		readonly isometric: string;
		readonly pool: string;
		readonly stop_rule: string;
	};
	readonly schedule: {
		readonly rotation_weeks: number;
		readonly session_budget_min: number;
		readonly sessions_per_week: number;
	};
	readonly sections: readonly {
		readonly bank: string;
		readonly id: string;
		readonly mode: string;
		readonly slots: readonly {
			readonly allow_repeat?: boolean;
			readonly exercises: readonly string[];
			readonly id: string;
			readonly kind: string;
			readonly label: string;
			readonly pick?: number;
			readonly rule?: string;
			readonly sec_each?: number;
		}[];
		readonly slug: string;
		readonly title: string;
	}[];
	readonly timing: {
		readonly hold_rest_sec: number;
		readonly rest_sec_accessory: number;
		readonly rest_sec_strength: number;
		readonly transition_sec: number;
		readonly warmup_general_min?: number;
		readonly work_sec_per_set: number;
	};
	readonly title: string;
	readonly user: string;
	readonly volume_targets?: Readonly<
		Record<string, { readonly max: number; readonly min: number }>
	>;
}

interface ReferenceFile {
	readonly id: string;
	readonly note?: string;
	readonly title: string;
	readonly url?: string;
}

interface UserFile {
	readonly id: string;
	readonly name: string;
	readonly programs: readonly string[];
}

interface VerdictFile {
	readonly hash: string;
	readonly id: string;
	readonly line: string;
	readonly oracle: string;
	readonly reason?: string;
	readonly verdict: string;
}

const assertCatalogEquipment: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is CatalogEquipment = (validator, value, subject) => {
	validator.assertValid(EQUIPMENT_SCHEMA_ID, value, subject);
};

const assertCatalogFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is CatalogFile = (validator, value, subject) => {
	validator.assertValid(BANK_SCHEMA_ID, value, subject);
};

const assertCatalogTarget: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is CatalogTarget = (validator, value, subject) => {
	validator.assertValid(TARGET_SCHEMA_ID, value, subject);
};

const assertProgramFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is ProgramFile = (validator, value, subject) => {
	validator.assertValid(PROGRAM_SCHEMA_ID, value, subject);
};

const assertReferenceFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is ReferenceFile = (validator, value, subject) => {
	validator.assertValid(SOURCE_SCHEMA_ID, value, subject);
};

const assertUserFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is UserFile = (validator, value, subject) => {
	validator.assertValid(USER_SCHEMA_ID, value, subject);
};

const assertVerdictFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is VerdictFile = (validator, value, subject) => {
	validator.assertValid(VERDICT_SCHEMA_ID, value, subject);
};

const equipmentItems = (source: CatalogJsonSource): readonly CatalogEquipment[] =>
	readJsonArray(source.equipmentFile).map((item, at) => {
		const subject = `${source.equipmentFile}${ITEM_MARK}${String(at)}`;
		assertCatalogEquipment(source.validator, item, subject);
		return item;
	});

const programItems = (source: CatalogJsonSource): readonly ProgramFile[] =>
	readJsonArray(source.programsFile).map((item, at) => {
		const subject = `${source.programsFile}${ITEM_MARK}${String(at)}`;
		assertProgramFile(source.validator, item, subject);
		return item;
	});

const referenceItems = (source: CatalogJsonSource): readonly ReferenceFile[] =>
	readJsonArray(source.referencesFile).map((item, at) => {
		const subject = `${source.referencesFile}${ITEM_MARK}${String(at)}`;
		assertReferenceFile(source.validator, item, subject);
		return item;
	});

const targetItems = (source: CatalogJsonSource): readonly CatalogTarget[] =>
	readJsonArray(source.targetsFile).map((item, at) => {
		const subject = `${source.targetsFile}${ITEM_MARK}${String(at)}`;
		assertCatalogTarget(source.validator, item, subject);
		return item;
	});

const userItems = (source: CatalogJsonSource): readonly UserFile[] =>
	readJsonArray(source.usersFile).map((item, at) => {
		const subject = `${source.usersFile}${ITEM_MARK}${String(at)}`;
		assertUserFile(source.validator, item, subject);
		return item;
	});

const verdictItems = (source: CatalogJsonSource): readonly VerdictFile[] =>
	readJsonArray(source.verdictsFile).map((item, at) => {
		const subject = `${source.verdictsFile}${ITEM_MARK}${String(at)}`;
		assertVerdictFile(source.validator, item, subject);
		return item;
	});

export const createCatalogJsonGateway = (source: CatalogJsonSource): CatalogGateway => ({
	readSourceCatalog: (): SourceCatalog => ({
		documents: documentsOf(source),
		equipment: equipmentOf(source),
		files: filesOf(source),
		persons: personsOf(source),
		programs: programsOf(source),
		references: referencesOf(source),
		targets: targetsOf(source),
		verdicts: verdictsOf(source)
	})
});

const bankNames = (source: CatalogJsonSource): readonly string[] =>
	readdirSync(source.modalityDirectory).filter((name) => name.endsWith(JSON_SUFFIX));

const documentsOf = (source: CatalogJsonSource): readonly SourceDocument[] => [
	...bankNames(source).map((name) => ({
		kind: DOCUMENT_KIND.banks,
		name,
		value: readJsonFile(path.join(source.modalityDirectory, name))
	})),
	{
		kind: DOCUMENT_KIND.equipment,
		name: source.equipmentFile,
		value: readJsonFile(source.equipmentFile)
	},
	{
		kind: DOCUMENT_KIND.programs,
		name: source.programsFile,
		value: readJsonFile(source.programsFile)
	},
	{
		kind: DOCUMENT_KIND.sources,
		name: source.referencesFile,
		value: readJsonFile(source.referencesFile)
	},
	{
		kind: DOCUMENT_KIND.targets,
		name: source.targetsFile,
		value: readJsonFile(source.targetsFile)
	},
	{ kind: DOCUMENT_KIND.users, name: source.usersFile, value: readJsonFile(source.usersFile) },
	{
		kind: DOCUMENT_KIND.verdicts,
		name: source.verdictsFile,
		value: readJsonFile(source.verdictsFile)
	}
];

const equipmentOf = (source: CatalogJsonSource): readonly SourceEquipment[] => {
	const items = findEquipment({
		readAll: (): readonly CatalogEquipment[] => equipmentItems(source)
	});
	return items.map((item) => ({
		canonEn: item.canonEn,
		id: item.id,
		kind: item.kind,
		name: item.name,
		slug: item.slug
	}));
};

const exerciseOf = (exercise: CatalogFileExercise): SourceExercise => ({
	constraints: {
		axial: exercise.constraints.axial,
		freeWeight: exercise.constraints.free_weight,
		...(exercise.constraints.kg_max !== undefined && {
			kgMax: exercise.constraints.kg_max
		}),
		lumbarExt: exercise.constraints.lumbar_ext,
		lumbarFlex: exercise.constraints.lumbar_flex
	},
	...(exercise.plane !== undefined && { corePlane: exercise.plane }),
	dose: exercise.dose,
	equipment: exercise.equipment,
	...(exercise.goal !== undefined && { goal: exercise.goal }),
	...(exercise.hip_plane !== undefined && { hipPlane: exercise.hip_plane }),
	id: exercise.id,
	...(exercise.met !== undefined && { met: exercise.met }),
	modality: exercise.mode,
	name: exercise.name,
	...(exercise.note !== undefined && { note: exercise.note }),
	procedureId: exercise.procedure.id,
	reference: exercise.source,
	...(exercise.seconds !== undefined && { seconds: exercise.seconds }),
	slug: exercise.slug,
	steps: exercise.procedure.steps.map((step) => stepOf(step)),
	targets: exercise.targets
});

const fileOf = (file: CatalogFile): SourceFile => ({
	excluded: file.excluded ?? [],
	groups: file.zones.map((zone) => ({
		id: zone.id,
		name: zone.title,
		...(zone.rule !== undefined && { rule: zone.rule }),
		slug: zone.slug,
		targets: zone.contours.map((contour) => ({
			exercises: contour.exercises.map((exercise) => exerciseOf(exercise)),
			id: contour.id,
			name: contour.title,
			...(contour.pick !== undefined && { pick: contour.pick }),
			slug: contour.slug
		}))
	})),
	id: file.id,
	rules: file.rules,
	...(file.session_budget_sec !== undefined && { sessionBudgetSec: file.session_budget_sec }),
	slug: file.slug,
	title: file.title
});

const filesOf = (source: CatalogJsonSource): readonly SourceFile[] =>
	bankNames(source)
		.map((name) => {
			const parsed = readJsonFile(path.join(source.modalityDirectory, name));
			assertCatalogFile(source.validator, parsed, name);
			return fileOf(parsed);
		})
		.toSorted((first, second) => rank(first.slug) - rank(second.slug));

const outsideGymOf = (program: ProgramFile): readonly SourceOutsideGym[] => {
	const { mobility_home: home, walking } = program.outside_gym ?? {};
	return [
		...(walking === undefined
			? []
			: [
					{
						intensity: walking.intensity,
						key: WALKING,
						minutes: walking.min_per_session,
						name: walking.name,
						perWeek: walking.sessions_per_week
					}
				]),
		...(home === undefined
			? []
			: [
					{
						key: MOBILITY_HOME,
						minutes: home.min_per_day,
						name: home.name,
						perWeek: home.days_per_week
					}
				])
	];
};

const personsOf = (source: CatalogJsonSource): readonly SourcePerson[] =>
	userItems(source).map((user) => ({ id: user.id, name: user.name, programs: user.programs }));

const programsOf = (source: CatalogJsonSource): readonly SourceProgram[] =>
	programItems(source).map((program) => ({
		contraindications: {
			axialLoad: program.contraindications.axial_load,
			freeWeightKgMax: program.contraindications.free_weight_kg_max,
			lumbarExtension: program.contraindications.loaded_lumbar_extension,
			lumbarFlexion: program.contraindications.loaded_lumbar_flexion
		},
		goals: { primary: program.goals.primary, secondary: program.goals.secondary },
		hipPlanes: program.hip_planes ?? [],
		id: program.id,
		outsideGym: outsideGymOf(program),
		pairings: program.pairing ?? [],
		person: program.user,
		progression: {
			drawn: program.progression.pool,
			isometric: program.progression.isometric,
			pinned: program.progression.base,
			stopRule: program.progression.stop_rule
		},
		rotationWeeks: program.schedule.rotation_weeks,
		sections: program.sections.map((section) => ({
			bank: section.bank,
			id: section.id,
			mode: section.mode,
			slots: section.slots.map((slot) => ({
				...(slot.allow_repeat !== undefined && { allowRepeat: slot.allow_repeat }),
				exercises: slot.exercises,
				id: slot.id,
				kind: slot.kind,
				label: slot.label,
				...(slot.pick !== undefined && { pick: slot.pick }),
				...(slot.rule !== undefined && { rule: slot.rule }),
				...(slot.sec_each !== undefined && { secEach: slot.sec_each })
			})),
			slug: section.slug,
			title: section.title
		})),
		sessionBudgetMin: program.schedule.session_budget_min,
		sessionsPerWeek: program.schedule.sessions_per_week,
		timing: {
			holdRestSec: program.timing.hold_rest_sec,
			restSecAccessory: program.timing.rest_sec_accessory,
			restSecStrength: program.timing.rest_sec_strength,
			transitionSec: program.timing.transition_sec,
			...(program.timing.warmup_general_min !== undefined && {
				warmupGeneralMin: program.timing.warmup_general_min
			}),
			workSecPerSet: program.timing.work_sec_per_set
		},
		title: program.title,
		volumes: Object.entries(program.volume_targets ?? {}).map(([group, volume]) => ({
			group,
			max: volume.max,
			min: volume.min
		}))
	}));

const rank = (slug: string): number => FILE_ORDER.indexOf(slug);

const referencesOf = (source: CatalogJsonSource): readonly SourceReference[] =>
	referenceItems(source).map((reference) => ({
		id: reference.id,
		...(reference.note !== undefined && { note: reference.note }),
		title: reference.title,
		...(reference.url !== undefined && { url: reference.url })
	}));

const stepOf = (step: CatalogFileStep): SourceStep => ({
	active: step.active,
	id: step.id,
	oracles: step.oracles.map((oracle) => ({
		counterModel: oracle.counterModel,
		id: oracle.id,
		model: oracle.model,
		predicate: oracle.predicate
	})),
	title: step.title
});

const targetsOf = (source: CatalogJsonSource): readonly SourceTarget[] => {
	const targets = findTargets({
		readAll: (): readonly CatalogTarget[] => targetItems(source)
	});
	return targets.map((target) => ({
		group: target.zone,
		id: target.id,
		kind: target.kind,
		latin: target.latin,
		name: target.name,
		slug: target.slug,
		...(target.group !== undefined && { targetGroup: target.group })
	}));
};

const verdictsOf = (source: CatalogJsonSource): readonly SourceVerdict[] =>
	verdictItems(source).map((verdict) => ({
		hash: verdict.hash,
		id: verdict.id,
		line: verdict.line,
		oracle: verdict.oracle,
		...(verdict.reason !== undefined && { reason: verdict.reason }),
		verdict: verdict.verdict
	}));
