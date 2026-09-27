const DATE_LOCALE = 'ru-RU';
const MOMENT_FORMAT = new Intl.DateTimeFormat(DATE_LOCALE, {
	dateStyle: 'medium',
	timeStyle: 'short'
});

export const momentOf = (iso: string): string => MOMENT_FORMAT.format(new Date(iso));
