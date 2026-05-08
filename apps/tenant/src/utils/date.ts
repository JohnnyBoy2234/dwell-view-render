const DEFAULT_LOCALE = 'en-ZA';

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

export function formatPublishedDate(date: string | Date): string {
  const publishDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(publishDate.getTime())) {
    return '';
  }

  return publishDate.toLocaleDateString(DEFAULT_LOCALE, DEFAULT_OPTIONS);
}

