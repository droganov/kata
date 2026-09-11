import { describe, expect, it } from 'vitest';

import { hasNoVisualForm, LINE_CLASS, lineClassOf } from './line-classes.ts';

describe('lineClassOf', () => {
	it('узнаёт симптом по слову «боль» и однокоренным', () => {
		expect(lineClassOf('Боль в пояснице')).toBe(LINE_CLASS.symptom);
		expect(lineClassOf('Колено болит')).toBe(LINE_CLASS.symptom);
		expect(lineClassOf('Тянет в подколенном сухожилии')).toBe(LINE_CLASS.symptom);
		expect(lineClassOf('Прострел отдаёт в ногу')).toBe(LINE_CLASS.symptom);
	});

	it('не считает симптомом слова, где «бол» — лишь начало другого слова', () => {
		expect(lineClassOf('Стопа стоит на болотистой опоре')).toBeUndefined();
	});

	it('узнаёт дыхание, дрейф, звук, темп и ощущение', () => {
		expect(lineClassOf('Дыхание ровное')).toBe(LINE_CLASS.breathing);
		expect(lineClassOf('К концу подхода таз опускается')).toBe(LINE_CLASS.drift);
		expect(lineClassOf('К 10 повтору темп падает')).toBe(LINE_CLASS.drift);
		expect(lineClassOf('Стук плит в стеке')).toBe(LINE_CLASS.sound);
		expect(lineClassOf('Без звука')).toBe(LINE_CLASS.sound);
		expect(lineClassOf('Рывок в подъёме')).toBe(LINE_CLASS.tempo);
		expect(lineClassOf('Ощущение скручивания')).toBe(LINE_CLASS.sensation);
		expect(lineClassOf('Вес держится собственным весом')).toBe(LINE_CLASS.sensation);
	});

	it('оставляет строки с визуальной формой без класса', () => {
		expect(lineClassOf('Лопатки на полу')).toBeUndefined();
		expect(hasNoVisualForm('Лопатки на полу')).toBe(false);
		expect(hasNoVisualForm('Задержка дыхания')).toBe(true);
	});
});
