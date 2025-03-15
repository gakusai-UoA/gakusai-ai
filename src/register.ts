import { Command, Option, register } from 'discord-hono';

const commands = [
	new Command('mailself', 'メールの文章の誤字脱字などをAIができる限り確認します。').options(new Option('メール本文', '本文を入力します。')),
	new Command('mailcheck', 'メールチェックを開始します。').options(new Option('メール本文', '本文を入力します。')),
	new Command('register', '直属の上司を設定します。').options(new Option('直属の上司', '直属の上司のIDを入力してください。')),
	new Command('namereg', '本名を設定します。').options(new Option('氏名', '本名を入力してください。')),
	new Command('reminderset', 'リマインダーを設定します。').options(new Option('内容', 'リマインドする内容を入力してください。'),new Option('時間', '時間をyyyy-mm-dd-hh-mmの形式で指定してください。'),new Option('リマインド先', 'チャンネルを#を入力して指定してください。Ex:#all01-出欠入力')),
];

//@ts-ignore
register(commands, process.env.DISCORD_APPLICATION_ID, process.env.DISCORD_TOKEN);
