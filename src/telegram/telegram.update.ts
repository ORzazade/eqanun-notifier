import {
  Action,
  Command,
  Ctx,
  Help,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../subscriptions/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { EqanunIngestJob } from '../eqanun/eqanun.ingest.job';
import { EqanunApiService } from '../eqanun/eqanun.api.service';
import { i18n } from './i18n';
import { TelegramServiceX } from './telegram.service';
import { normalizeForMatch } from '../common/utils/text.util'; // added

type SubType = 'ALL' | 'CATEGORY' | 'KEYWORD';

@Update()
export class TelegramUpdate {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    private readonly ingestJob: EqanunIngestJob,
    private readonly api: EqanunApiService, // used by /topics
    private readonly tgService: TelegramServiceX, // added
  ) { }

  // Ephemeral in-memory capture for keyword flow (simple and effective for single replica)
  private pendingKeyword = new Map<string, boolean>(); // chatId -> waiting

  // -------------- Helpers --------------
  private async upsertUser(chatId: string): Promise<User> {
    let u = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!u) {
      u = this.users.create({ telegramChatId: chatId });
      u = await this.users.save(u);
    }
    return u;
  }

  private subKeyboard(locale: string = 'az') {
    return {
      inline_keyboard: [
        [{ text: locale === 'en' ? '✨ All' : '✨ Hamısı', callback_data: 'SUB_ALL' }],
        [{ text: locale === 'en' ? '📜 Laws (LAW)' : '📜 Qanunlar (LAW)', callback_data: 'SUB_CAT:LAW' }],
        [{ text: locale === 'en' ? '🖊️ Decrees (DECREE)' : '🖊️ Fərmanlar (DECREE)', callback_data: 'SUB_CAT:DECREE' }],
        [{ text: locale === 'en' ? '📎 Decisions (DECISION)' : '📎 Sərəncamlar (DECISION)', callback_data: 'SUB_CAT:DECISION' }],
        [{ text: locale === 'en' ? '🔎 Keyword…' : '🔎 Açar söz…', callback_data: 'SUB_KEYWORD' }],
      ],
    };
  }

  private async ensureUser(ctx: Context): Promise<User | null> {
    const chatId = String(ctx.chat?.id);
    if (!chatId) {
      await ctx.reply('Chat tapılmadı.');
      return null;
    }
    return this.upsertUser(chatId);
  }

  // -------------- Start / Help --------------
  @Start()
  async onStart(@Ctx() ctx: any) {
    const chatId = String(ctx.chat.id);
    const user = await this.upsertUser(chatId);

    // Deep link payloads: cat_XXX or kw_<term>
    const payload: string | undefined = ctx.startPayload;
    if (payload) {
      const locale = user.locale;
      if (payload.startsWith('cat_')) {
        const cat = payload.replace('cat_', '').toUpperCase();
        const r = await this.addSubscription(user, 'CATEGORY', cat);
        await ctx.reply(r.created ? i18n.t(locale,'sub_added_cat',{cat}) : i18n.t(locale,'sub_exists_cat',{cat}));
        return; // avoid returning the Message object
      }
      if (payload.startsWith('kw_')) {
        const term = decodeURIComponent(payload.replace('kw_', ''));
        const r = await this.addSubscription(user, 'KEYWORD', term);
        await ctx.reply(r.created ? i18n.t(locale,'sub_added_keyword',{term}) : i18n.t(locale,'sub_exists_keyword',{term}));
        return;
      }
    }

    await ctx.reply(i18n.t(user.locale,'welcome'));
    await ctx.reply(i18n.t(user.locale,'choose_sub_type'), { reply_markup: this.subKeyboard(user.locale) });
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    await ctx.reply(i18n.t(locale,'help_lines'));
  }

  // -------------- Subscribe (menu + actions) --------------
  @Command('subscribe')
  async subscribeMenu(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    await ctx.reply(i18n.t(locale,'choose_sub_type'), { reply_markup: this.subKeyboard(locale) });
  }

  @Action('SUB_ALL')
  async subAll(@Ctx() ctx: any) {
    const user = await this.ensureUser(ctx);
    if (!user) return;
    const r = await this.addSubscription(user, 'ALL', null);
    const locale = user.locale;
    await ctx.editMessageText(r.created ? i18n.t(locale,'sub_added_all') : i18n.t(locale,'sub_exists_all'));
  }

  @Action(/^SUB_CAT:(.+)$/)
  async subCategory(@Ctx() ctx: any) {
    const cat = String(ctx.match[1]).toUpperCase();
    const user = await this.ensureUser(ctx);
    if (!user) return;
    const r = await this.addSubscription(user, 'CATEGORY', cat);
    await ctx.editMessageText(r.created ? i18n.t(user.locale,'sub_added_cat',{cat}) : i18n.t(user.locale,'sub_exists_cat',{cat}));
  }

  @Action('SUB_KEYWORD')
  async askKeyword(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    this.pendingKeyword.set(chatId, true);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    await ctx.editMessageText(i18n.t(locale,'prompt_keyword'));
  }

  // -------------- Topics (dynamic from API) --------------
  @Command('topics')
  async topics(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    const types = await this.api.uniqueTypeNames(200);
    if (!types.length) { await ctx.reply(i18n.t(locale,'topics_none')); return; }
    // Build keyboard (max ~20 to keep it usable)
    const rows = types.slice(0, 20).map((t) => ([
      { text: t, callback_data: `SUB_TYPE:${encodeURIComponent(t)}` },
    ]));
    await ctx.reply(i18n.t(locale,'topics_choose'), {
      reply_markup: { inline_keyboard: rows },
    });
  }

  @Action(/^SUB_TYPE:(.+)$/)
  async subTypeName(@Ctx() ctx: any) {
    const typeName = decodeURIComponent(ctx.match[1]);
    const user = await this.ensureUser(ctx);
    if (!user) return;
    const r = await this.addSubscription(user, 'KEYWORD', typeName);
    await ctx.editMessageText(r.created ? i18n.t(user.locale,'sub_added_typeName',{name:typeName}) : i18n.t(user.locale,'sub_exists_typeName',{name:typeName}));
  }

  // -------------- Manage (list + one-tap unsubscribe) --------------
  @Command('manage')
  async manage(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) return ctx.reply('Başlamaq üçün /start yazın.');
    const subs = await this.subs.find({ where: { user: { id: user.id } } });
    const locale = user.locale;
    if (!subs.length) { await ctx.reply(i18n.t(locale,'subs_none')); return; }
    const rows = subs.map((s) => ([
      {
        text: `${s.type}${s.query ? `: ${s.query}` : ''} ✖`,
        callback_data: `UNSUB:${s.id}`,
      },
    ]));
    await ctx.reply(i18n.t(locale,'subs_title'), {
      reply_markup: { inline_keyboard: rows },
    });
  }

  @Action(/^UNSUB:(.+)$/)
  async unsub(@Ctx() ctx: any) {
    const id = String(ctx.match[1]);
    await this.subs.delete(id);
    const chatId = String(ctx.chat.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    await ctx.answerCbQuery(i18n.t(locale,'unsub_deleted_cb'));
    await ctx.editMessageText(i18n.t(locale,'unsub_deleted_text'));
  }

  // -------------- Simple list/legacy commands --------------
  @Command('list')
  async list(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) return ctx.reply('Başlamaq üçün /start yazın.');
    const subs = await this.subs.find({ where: { user: { id: user.id } } });
    const locale = user.locale;
    if (!subs.length) { await ctx.reply(i18n.t(locale,'subs_none')); return; }
    const lines = subs.map((s) => `• ${s.type}${s.query ? `: ${s.query}` : ''}`);
    await ctx.reply(lines.join('\n'));
  }

  // -------------- Language toggle --------------
  @Command('lang')
  async lang(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    await ctx.reply(i18n.t(locale,'lang_choose'), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇦🇿 AZ', callback_data: 'LANG:az' },
            { text: '🇬🇧 EN', callback_data: 'LANG:en' },
          ],
        ],
      },
    });
  }

  @Action(/^LANG:(az|en)$/)
  async setLang(@Ctx() ctx: any) {
    const lang = ctx.match[1];
    const chatId = String(ctx.chat.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) return;
    user.locale = lang;
    await this.users.save(user);
    await this.tgService.updateChatCommands(chatId, lang); 
    await ctx.editMessageText(lang === 'az' ? i18n.t('az','lang_set_az') : i18n.t('en','lang_set_en'));
  }

  // -------------- Admin /sync --------------
  @Command('sync')
  async sync(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    const locale = user?.locale ?? 'az';
    if (String(ctx.chat?.id) !== String(process.env.TG_ADMIN_CHAT_ID)) {
      return ctx.reply(i18n.t(locale,'sync_admin_only'));
    }
    await ctx.reply(i18n.t(locale,'sync_starting'));
    const res = await this.ingestJob.manual();
    await ctx.reply(i18n.t(locale,'sync_done',{created:res.created,updated:res.updated,maxId:res.maxId}));
  }

  // -------------- Text handler (keyword capture) --------------
  @On('text')
  async onAnyText(@Ctx() ctx: Context) {
    const text = (ctx.message as any)?.text?.trim() ?? '';
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) return ctx.reply('Başlamaq üçün /start yazın.');

    // Ignore commands so only their dedicated handlers reply (prevents accidental extra replies like "[object Object]")
    if (text.startsWith('/')) {
      return;
    }

    const locale = user.locale;
    if (this.pendingKeyword.get(chatId)) {
      this.pendingKeyword.delete(chatId);
      const r = await this.addSubscription(user, 'KEYWORD', text);
      await ctx.reply(r.created ? i18n.t(locale,'sub_added_keyword',{term:text}) : i18n.t(locale,'sub_exists_keyword',{term:text}));
      return;
    }

  }

  private async addSubscription(user: User, type: SubType, query: string | null) {
    let normQuery: string | null = query;
    if (type === 'CATEGORY' && normQuery) normQuery = normQuery.toUpperCase();
    if (type === 'ALL') normQuery = null;

    // Duplicate prevention (keyword fuzzy)
    if (type === 'KEYWORD' && normQuery) {
      const newNorm = normalizeForMatch(normQuery);
      const existingKeywords = await this.subs.find({
        where: { user: { id: user.id }, type: 'KEYWORD' },
      });
      const clash = existingKeywords.find(s => normalizeForMatch(s.query || '') === newNorm);
      if (clash) {
        return { created: false, existing: clash };
      }
    }

    const existing = await this.subs.findOne({
      where: { user, type, query: normQuery === null ? undefined : normQuery },
    });
    if (existing) {
      return { created: false, existing };
    }
    try {
      const created = await this.subs.save(
        this.subs.create({ user, type, query: normQuery }),
      );
      return { created: true, existing: created };
    } catch (e: any) {
      if (e?.message?.includes('duplicate key')) {
        const again = await this.subs.findOne({
          where: { user, type, query: normQuery === null ? undefined : normQuery },
        });
        return { created: false, existing: again! };
      }
      throw e;
    }
  }
}
