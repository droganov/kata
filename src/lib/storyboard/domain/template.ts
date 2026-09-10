import type { Frame, FrameOracle, OracleLine, PromptLine } from './prompt.ts';

const CANVAS_WIDTH = 1206;
const CANVAS_HEIGHT = 2622;
const EVEN_COLUMNS = 2;
const SINGLE_COLUMN = 1;

const FIGURE_LINE =
	'FIGURE. The same écorché mannequin in every frame: adult, gender-neutral, no clothing, no shoes, no hair, neutral face, translucent grey skin with muscles visible through it. One figure, one set of proportions, one scale in all frames.';
const MUSCLES_LINE =
	'MUSCLES. In each frame exactly the muscles listed under ACTIVE are solid saturated red; every other muscle neutral grey.';
const MODEL_HEAD = '      ∀ true:';
const COUNTER_HEAD = '      ¬∃ none:';
const DECISION_HEAD = 'DECISION RULE.';
const DECISION_ONE =
	'  1. A predicate or ∀ line is true of frame i when the drawing of frame i shows what it states. A ¬∃ line occurs in frame i when the drawing of frame i shows the sign it describes. Lines marked ~ (sensation, breathing, timing, sound, drift over time) have no visual form and take no part in the rule.';
const DECISION_TWO =
	'  2. Oracle F{i}.O{j} is satisfied by frame i when its predicate is true of frame i, every ∀ line is true of frame i, and no ¬∃ line occurs in frame i.';
const DECISION_THREE =
	'  3. Frame i is correct when every oracle of frame i is satisfied; the red muscles are exactly its ACTIVE list; the view matches its CAMERA line; for a HOLD or REPEAT frame the ∀ lines of the frame before it are also true of it.';

const EMPTY_LINE = '';
const ITEM_SEPARATOR = '; ';
const NO_MUSCLES = 'none';
const SPACE = ' ';
const PREDICATE_DEPTH = 4;
const ORACLE_DEPTH = 6;
const PREDICATE_INDENT = SPACE.repeat(PREDICATE_DEPTH);
const ORACLE_INDENT = SPACE.repeat(ORACLE_DEPTH);
const MARKED_GAP = ' ~ ';
const PLAIN_GAP = '  ';
const NEW_LINE = '\n';

const UNICODE_FLAG = 'u';
const WORD_END = String.raw`(?![\p{L}\p{N}_])`;
const WORD_START = String.raw`(?<![\p{L}\p{N}_])`;

const STOP_WORDS: readonly string[] = [
	'draft',
	'redraw',
	'regenerate',
	'edit',
	'verify',
	'check',
	'output',
	'reference',
	'existing',
	'previous',
	'identical',
	'expected',
	'assess',
	'apply',
	'change',
	'again',
	'your own',
	'finish',
	'fail',
	'decide',
	'find in',
	'composition'
];

export interface PromptHead {
	readonly auxiliary: readonly string[];
	readonly dose: string;
	readonly frameCount: number;
	readonly main: readonly string[];
	readonly name: string;
}

export interface RuleCounts {
	readonly frameCount: number;
	readonly marked: number;
	readonly rule: number;
}

const dataLine = (text: string): PromptLine => ({ isData: true, text });

const templateLine = (text: string): PromptLine => ({ isData: false, text });

const oracleLineText = (indent: string, line: OracleLine): string =>
	`${indent}${line.id}${line.isMarked ? MARKED_GAP : PLAIN_GAP}${line.text}`;

const auxiliaryText = (auxiliary: readonly string[]): string =>
	auxiliary.length === 0 ? EMPTY_LINE : `; AUXILIARY: ${auxiliary.join(ITEM_SEPARATOR)}`;

const activeText = (muscles: readonly string[]): string =>
	`  ACTIVE (solid red): ${muscles.length === 0 ? NO_MUSCLES : muscles.join(ITEM_SEPARATOR)}.`;

const stopWordPattern = (word: string): RegExp =>
	new RegExp(`${WORD_START}${word}${WORD_END}`, UNICODE_FLAG);

export function assertTemplateWords(lines: readonly PromptLine[]): void {
	const text = lines
		.filter((line) => !line.isData)
		.map((line) => line.text)
		.join(NEW_LINE)
		.toLowerCase();
	const found = STOP_WORDS.filter((word) => stopWordPattern(word).test(text));
	if (found.length > 0) throw new Error(`стоп-слова в шаблоне: ${found.join(ITEM_SEPARATOR)}`);
}

export function decisionLines(counts: RuleCounts): readonly PromptLine[] {
	const total = String(counts.frameCount);
	return [
		templateLine(DECISION_HEAD),
		templateLine(DECISION_ONE),
		templateLine(DECISION_TWO),
		templateLine(DECISION_THREE),
		templateLine(
			`  4. The picture is correct when CANVAS holds and every frame 1 … ${total} is correct. Draw so that the picture is correct.`
		),
		templateLine(
			`  Lines in the rule: ${String(counts.rule)}; marked ~: ${String(counts.marked)}.`
		)
	];
}

export function frameLines(frame: Frame): readonly PromptLine[] {
	return [
		dataLine(`FRAME ${String(frame.number)} — ${frame.title}`),
		templateLine(activeText(frame.activeMuscles)),
		...frameSideLines(frame),
		...frame.oracles.flatMap((oracle) => oracleLines(oracle)),
		templateLine(`  CAMERA: ${frame.camera}; whole figure and equipment in the tile.`),
		templateLine(EMPTY_LINE)
	];
}

export function headLines(head: PromptHead): readonly PromptLine[] {
	const total = String(head.frameCount);
	const columns = head.frameCount % EVEN_COLUMNS === 0 ? EVEN_COLUMNS : SINGLE_COLUMN;
	const rows = Math.floor(head.frameCount / columns);
	const tileWidth = Math.floor(CANVAS_WIDTH / columns);
	const tileHeight = Math.floor(CANVAS_HEIGHT / rows);
	return [
		dataLine(`STORYBOARD — ${head.name} — dose ${head.dose}`),
		templateLine(
			`${total} frames, one per step, numbered 1–${total}. Instructional anatomy illustration, neutral studio background.`
		),
		templateLine(
			`CANVAS. One image ${String(CANVAS_WIDTH)}×${String(CANVAS_HEIGHT)} px, portrait. ${total} tiles, ${String(columns)} column(s) × ${String(rows)} row(s), each ${String(tileWidth)}×${String(tileHeight)} px, edge to edge: zero gap, zero margin, zero border, nothing outside the tiles. Order left to right, top to bottom = frame 1 … ${total}. The only text: the frame number in the top-left corner of each tile.`
		),
		templateLine(FIGURE_LINE),
		templateLine(MUSCLES_LINE),
		templateLine(
			`EQUIPMENT. MAIN: ${head.main.join(ITEM_SEPARATOR)}${auxiliaryText(head.auxiliary)}. Catalog form; nothing else in the scene.`
		),
		templateLine(EMPTY_LINE)
	];
}

export function promptTextOf(lines: readonly PromptLine[]): string {
	return lines.map((line) => line.text).join(NEW_LINE);
}

function frameSideLines(frame: Frame): readonly PromptLine[] {
	const side = frame.workingSide;
	const carry = frame.carry;
	const lines: PromptLine[] = [];
	if (side !== undefined)
		lines.push(
			templateLine(`  WORKING SIDE: ${side} (one-sided lines refer to the ${side} side).`)
		);
	if (carry !== undefined) {
		const source = String(carry.source);
		lines.push(
			templateLine(
				`  ${carry.kind.toUpperCase()} of frame ${source}: the ∀ lines of frame ${source} also hold here.`
			)
		);
	}
	return lines;
}

function oracleLines(oracle: FrameOracle): readonly PromptLine[] {
	return [
		dataLine(oracleLineText(PREDICATE_INDENT, oracle.predicate)),
		templateLine(MODEL_HEAD),
		...oracle.model.map((line) => dataLine(oracleLineText(ORACLE_INDENT, line))),
		templateLine(COUNTER_HEAD),
		...oracle.counterModel.map((line) => dataLine(oracleLineText(ORACLE_INDENT, line)))
	];
}
