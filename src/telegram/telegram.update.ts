import { Ctx, Help, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../subscriptions/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';

@Update()
export class TelegramUpdate {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const chatId = String(ctx.chat!.id);
    let user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) {
      user = this.users.create({ telegramChatId: chatId });
      await this.users.save(user);
    }
    await ctx.reply(
`Salam! Yeni hüquqi aktlar barədə bildirişlər üçün hazıram.
Əmrlər:
/subscribe all
/subscribe category LAW|DECREE|DECISION
/subscribe keyword <word>
/list
/unsubscribe <filter>`
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('İstifadə: /subscribe all | /subscribe category LAW | /subscribe keyword vergi');
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const text = (ctx.message as any)?.text?.trim() ?? '';
    const chatId = String(ctx.chat!.id);
    const user = await this.users.findOne({ where: { telegramChatId: chatId } });
    if (!user) return ctx.reply('Başlamaq üçün /start yazın.');

    if (text.startsWith('/subscribe')) {
      const args = text.replace('/subscribe', '').trim();
      if (!args) return ctx.reply('Usage: /subscribe all|category <C>|keyword <K>');
      if (args === 'all') {
        await this.subs.save(this.subs.create({ user, type: 'ALL', query: null }));
        return ctx.reply('Subscribed to ALL updates.');
      }
      const [kind, ...rest] = args.split(/\s+/);
      if (kind === 'category') {
        const q = rest.join(' ').toUpperCase();
        await this.subs.save(this.subs.create({ user, type: 'CATEGORY', query: q }));
        return ctx.reply(`Subscribed to category ${q}.`);
      }
      if (kind === 'keyword') {
        const q = rest.join(' ');
        if (!q) return ctx.reply('Provide a keyword.');
        await this.subs.save(this.subs.create({ user, type: 'KEYWORD', query: q }));
        return ctx.reply(`Subscribed to keyword "${q}".`);
      }
      return ctx.reply('Usage: /subscribe all|category <C>|keyword <K>');
    }

    if (text.startsWith('/list')) {
      const subs = await this.subs.find({ where: { user } });
      if (!subs.length) return ctx.reply('No subscriptions.');
      const lines = subs.map(s => `• ${s.type}${s.query ? `: ${s.query}` : ''}`);
      return ctx.reply(lines.join('\n'));
    }

    if (text.startsWith('/unsubscribe')) {
      const q = text.replace('/unsubscribe', '').trim();
      if (!q) return ctx.reply('Specify ALL|CATEGORY <C>|KEYWORD <K>');
      if (q === 'all') {
        await this.subs.delete({ user: { id: user.id }, type: 'ALL' as any });
        return ctx.reply('Unsubscribed from ALL.');
      }
      const removed = await this.subs.delete({ user: { id: user.id }, query: q });
      return ctx.reply(removed.affected ? 'Removed.' : 'Nothing matched.');
    }
  }
}
