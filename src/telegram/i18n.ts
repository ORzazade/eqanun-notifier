export type Locale = 'az' | 'en';

type Dict = Record<Locale, Record<string, string>>;

const dict: Dict = {
  az: {
    // Commands
    cmd_start: 'Başla',
    cmd_subscribe: 'Abunə ol (sürətli seçim)',
    cmd_list: 'Abunələri göstər',
    cmd_manage: 'Abunələri idarə et',
    cmd_topics: 'Rəsmi bölmələrdən seç',
    cmd_lang: 'Dili dəyiş',
    cmd_help: 'Kömək',

    // General
    chat_not_found: 'Chat tapılmadı.',
    welcome: 'Salam! Yeni hüquqi aktlar barədə bildirişlər üçün hazıram.',
    choose_sub_type: 'Abunə növünü seçin:',
    start_first: 'Başlamaq üçün /start yazın.',
    subs_none: 'Abunə yoxdur.',
    subs_title: 'Abunələriniz:',
    topics_choose: 'Rəsmi bölmələrdən seçin:',
    topics_none: 'Bölmələr tapılmadı.',
    prompt_keyword: 'Açar sözü yazın (məs.: "vergi")',

    // Subscription results
    sub_added_all: '✅ Hamısı üçün abunə aktivdir.',
    sub_exists_all: 'ℹ️ Artıq "Hamısı" üçün abunəsiniz.',
    sub_added_cat: '✅ {cat} üçün abunə aktivdir.',
    sub_exists_cat: 'ℹ️ {cat} üçün artıq abunəsiniz.',
    sub_added_keyword: '✅ Açar sözü üçün abunə aktivdir: “{term}”',
    sub_exists_keyword: 'ℹ️ Bu açar söz üçün artıq abunəsiniz: “{term}”',
    sub_added_typeName: '✅ {name} üzrə abunə aktivdir.',
    sub_exists_typeName: 'ℹ️ {name} üzrə artıq abunəsiniz.',
    unsub_deleted_cb: 'Silindi',
    unsub_deleted_text: '✅ Silindi. /manage yazıb yeniləyə bilərsiniz.',

    // Language
    lang_choose: 'Dil seçin:',
    lang_set_az: '✅ Dil: AZ',
    lang_set_en: '✅ Dil: EN',

    // Sync / Admin
    sync_admin_only: '⛔️ Yalnız admin /sync işlədə bilər.',
    sync_starting: '⏳ Sync başladı…',
    sync_done: '✅ Sync bitdi: {created} yeni, {updated} yeniləndi. MaxID={maxId}',

    // Help
    help_lines: [
      'Əmrlər:',
      '/subscribe – sürətli seçim menyusu',
      '/list – abunələri göstər',
      '/manage – abunələri idarə et (sil)',
      '/topics – rəsmi bölmələrdən seç',
      '/lang – dili dəyiş',
      '/digest – (əgər aktiv etsəniz) gündəlik xülasə',
    ].join('\n'),
  },
  en: {
    cmd_start: 'Start',
    cmd_subscribe: 'Subscribe (quick menu)',
    cmd_list: 'List subscriptions',
    cmd_manage: 'Manage subscriptions',
    cmd_topics: 'Choose from official sections',
    cmd_lang: 'Change language',
    cmd_help: 'Help',

    chat_not_found: 'Chat not found.',
    welcome: 'Hello! I am ready to notify you about new legal acts.',
    choose_sub_type: 'Select a subscription type:',
    start_first: 'Send /start to begin.',
    subs_none: 'No subscriptions.',
    subs_title: 'Your subscriptions:',
    topics_choose: 'Choose from official sections:',
    topics_none: 'No sections found.',
    prompt_keyword: 'Enter a keyword (e.g. "tax")',

    sub_added_all: '✅ Subscribed to ALL.',
    sub_exists_all: 'ℹ️ Already subscribed to ALL.',
    sub_added_cat: '✅ Subscribed to {cat}.',
    sub_exists_cat: 'ℹ️ Already subscribed to {cat}.',
    sub_added_keyword: '✅ Subscribed to keyword: “{term}”',
    sub_exists_keyword: 'ℹ️ Already subscribed to keyword: “{term}”',
    sub_added_typeName: '✅ Subscribed for {name}.',
    sub_exists_typeName: 'ℹ️ Already subscribed for {name}.',
    unsub_deleted_cb: 'Deleted',
    unsub_deleted_text: '✅ Deleted. You can refresh with /manage.',

    lang_choose: 'Choose language:',
    lang_set_az: '✅ Language: AZ',
    lang_set_en: '✅ Language: EN',

    sync_admin_only: '⛔️ Only admin can run /sync.',
    sync_starting: '⏳ Sync started…',
    sync_done: '✅ Sync finished: {created} new, {updated} updated. MaxID={maxId}',

    help_lines: [
      'Commands:',
      '/subscribe – quick menu',
      '/list – list subscriptions',
      '/manage – manage (delete) subscriptions',
      '/topics – choose from official sections',
      '/lang – change language',
      '/digest – (if enabled) daily digest',
    ].join('\n'),
  },
};

export function t(locale: string | undefined, key: string, vars?: Record<string, string | number>) {
  const lang: Locale = (locale === 'en' ? 'en' : 'az');
  let value = dict[lang][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return value;
}

export const i18n = { t };
