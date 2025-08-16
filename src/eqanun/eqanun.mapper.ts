import { EqanunApiItem } from './eqanun.api.service';

export function normalizeCategory(typeName: string): string {
  const t = (typeName || '').toLowerCase();
  if (t.includes('qanunu')) return 'LAW';
  if (t.includes('fərman') || t.includes('ferman')) return 'DECREE';
  if (t.includes('sərəncam') || t.includes('serencam')) return 'DECISION';
  return 'OTHER';
}

export function apiItemToRawAct(item: EqanunApiItem) {
  const url = `https://e-qanun.az/framework/${item.id}`;
  // Prefer ISO date if present
  const publishedDate =
    item.classCode /* "2025-08-14" */ ||
    (item.acceptDate ? item.acceptDate.split('.').reverse().join('-') : undefined);

  return {
    eqanunId: item.id,
    title: item.title,
    category: normalizeCategory(item.typeName || ''),
    url,
    publishedDate,
    contentHash: undefined, 
  };
}
