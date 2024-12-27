import { Command, Option, register } from 'discord-hono';

const commands = [
	new Command('mailself', 'メールの文章の誤字脱字などをAIができる限り確認します。').options(new Option('メール本文', '本文を入力します。')),
	new Command('mailcheck', 'メールチェックを開始します。').options(new Option('メール本文', '本文を入力します。')),
];

//@ts-ignore
register(commands, process.env.DISCORD_APPLICATION_ID, process.env.DISCORD_TOKEN);
