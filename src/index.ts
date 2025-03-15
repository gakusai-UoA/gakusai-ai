import { DiscordHono, CommandContext, Embed, CronContext } from 'discord-hono';

// Define environment bindings interface
interface Env {
	gakusai_reminder_kv: KVNamespace;
	gakusai_user_kv: KVNamespace;
	gakusai_name_kv: KVNamespace;
	[key: string]: unknown;
}

// DiscordHonoアプリの初期化
//@ts-expect-error

const app = new DiscordHono<Env>();

interface Suggestion {
	word: string;
	suggestion: string;
	note: string;
	rule: string;
	offset: string;
	length: string;
}

interface PostResult {
	modifiedText: string;
	details: Array<{
		word: string;
		suggestion: string;
		note: string;
		rule: string;
	}>;
	alerts?: Array<{
		pos: number;
		word: string;
		suggestions: string[];
		score: number;
	}>;
	status?: number;
}

interface Reminder {
	content: string;
	time: string;
	channel: string;
	userId: string;
}

// リマインダーチェックのcron (毎分実行)
//@ts-expect-error
const cronHandler = async (c: CronContext<Env>) => {
	try {
		// WorkersのUTC時刻をJST(UTC+9)に変換
		const now = new Date();
		now.setHours(now.getHours() + 9); // UTC→JST変換

		const timeStr =
			now.getFullYear() +
			'-' +
			String(now.getMonth() + 1).padStart(2, '0') +
			'-' +
			String(now.getDate()).padStart(2, '0') +
			'-' +
			String(now.getHours()).padStart(2, '0') +
			'-' +
			String(now.getMinutes()).padStart(2, '0');

		console.log('Current JST time:', timeStr);

		// KVストアから全てのキーをリスト
		//@ts-expect-error
		const { keys } = await c.env.gakusai_reminder_kv.list();
		console.log(
			'Available keys:',
			//@ts-expect-error
			keys.map((k) => k.name)
		);

		// 現在時刻に一致するリマインダーを探す
		for (const key of keys) {
			console.log('Checking key:', key.name);
			// 完全一致で時間を比較（reminder:YYYY-MM-DD-HH-MM:userIdの形式）
			const keyTime = key.name.split(':')[1];
			if (keyTime === timeStr) {
				console.log('Found matching reminder:', key.name);

				// リマインダーデータを取得
				//@ts-expect-error
				const reminderJson = await c.env.gakusai_reminder_kv.get(key.name);
				if (reminderJson) {
					const reminder: Reminder = JSON.parse(reminderJson);
					console.log('Reminder data:', reminder);

					// チャンネルIDを mention 形式 (<#123456789>) から抽出
					const channelId = reminder.channel.match(/<#(\d+)>/)?.[1];
					if (!channelId) {
						console.error('Invalid channel ID format:', reminder.channel);
						continue;
					}

					console.log('Sending reminder to channel:', channelId);

					// Discord APIを使用してメッセージを送信
					//@ts-expect-error
					await c.rest('POST', '/channels/{channel.id}/messages', [channelId], {
						embeds: [
							new Embed()
								.title('リマインダー')
								.description(`<@${reminder.userId}>\n${reminder.content}`)
								.timestamp(new Date().toISOString())
								.color(0x00ff00)
								.footer({ text: 'リマインダー通知' }),
						],
					});
					console.log('Successfully sent reminder');

					// 送信済みのリマインダーを削除
					//@ts-expect-error
					await c.env.gakusai_reminder_kv.delete(key.name);
					console.log('Deleted reminder from KV store');
				}
			}
		}
	} catch (error) {
		console.error('Scheduled task error:', error);
	}
};

app.cron('', cronHandler);

app.command('mailself', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			if (!c.var.メール本文) {
				return c.res({
					embeds: [
						new Embed()
							.title('エラー')
							.description(`メール本文が指定されていません。`)
							.timestamp(new Date().toISOString())
							.color(0xff0000)
							.footer({ text: 'メールチェッカー' }),
					],
				});
			}
			const { modifiedText, details, alerts, status } = await post(c.var.メール本文);
			const res = await get(c.var.メール本文);
			const finalAlerts = res.alerts && Array.isArray(res.alerts) ? res.alerts : alerts;
			const finalStatus = res.status !== undefined ? res.status : status;
			if (details.length === 0 && finalStatus === 0) {
				const embed = new Embed()
					.title('メールをチェックしました。')
					.description(`AIは修正すべき部分を指摘しませんでした。`)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				const warnembed = new Embed()
					.title('AIは完璧ではありません。')
					.description(`必ず人間のチェックを受けてください。`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				return await c.followup({ embeds: [embed, warnembed] });
			} else {
				let returnValue = [];
				const embed = new Embed()
					.title('メールをチェックしました。')
					.description(`AIができる限り修正したテキスト: ${modifiedText}`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(embed);
				details.forEach((d, i) => {
					let detailembed = new Embed()
						.title('Yahoo! AIがミスだと思ったところ' + (i + 1))
						.description(`単語: ${d.word}\n ルール: ${d.rule}\n 修正提案: ${d.suggestion || 'なし'}\n メモ: ${d.note || 'なし'}`);
					returnValue.push(detailembed);
				});
				if (finalAlerts && Array.isArray(finalAlerts)) {
					finalAlerts.forEach((a: { pos: number; word: string; suggestions: string[]; score: number }, i: number) => {
						let Recruitembed = new Embed()
							.title('Recruit AIがミスだと思ったところ' + (i + 1))
							.description(
								`位置 (最初からの文字数): ${a.pos}\n単語: ${a.word}\n修正提案: ${a.suggestions.join(', ')}\n信頼度: ${(
									a.score * 100
								).toFixed(2)}%`
							);
						returnValue.push(Recruitembed);
					});
				}
				const warnembed = new Embed()
					.title('AIは完璧ではありません。')
					.description(`必ず人間のチェックを受けてください。`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(warnembed);
				return await c.followup({ embeds: returnValue });
			}
		} catch (error) {
			console.error(error);
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.command('mailcheck', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			if (!c.var.メール本文) {
				return c.res({
					embeds: [
						new Embed()
							.title('エラー')
							.description(`メール本文が指定されていません。`)
							.timestamp(new Date().toISOString())
							.color(0xff0000)
							.footer({ text: 'メールチェッカー' }),
					],
				});
			}
			const { modifiedText, details, alerts, status } = await post(c.var.メール本文);
			//@ts-ignore
			const res = await get(c.var.メール本文);
			const finalAlerts = res.alerts && Array.isArray(res.alerts) ? res.alerts : alerts;
			const finalStatus = res.status !== undefined ? res.status : status;
			const userId = c.interaction?.user?.id || c.interaction?.member?.user?.id;
			const BossId = await c.env.gakusai_user_kv.get(userId);
			if (details.length === 0 && finalStatus === 0) {
				const embed = new Embed()
					.title('メールをチェックしました。')
					.description(`AIはあなたの文章に指摘をしませんでした。`)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				const askembed = new Embed()
					.title(`メールチェックをしてください。`)
					.description(BossId)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				const bodyEmbed = new Embed()
					.title(`本文`)
					.description(c.var.メール本文)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				return await c.followup({ embeds: [embed, askembed, bodyEmbed] });
			} else {
				let returnValue = [];
				const embed = new Embed()
					.title('メールをチェックしました。')
					.description(`AIができる限り修正したテキスト:\n ${modifiedText}`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(embed);
				details.forEach((d, i) => {
					let detailembed = new Embed()
						.title('Yahoo! AIがミスだと思ったところ' + (i + 1))
						.description(`単語: ${d.word}\n ルール: ${d.rule}\n 修正提案: ${d.suggestion || 'なし'}\n メモ: ${d.note || 'なし'}`);
					returnValue.push(detailembed);
				});
				if (finalAlerts && Array.isArray(finalAlerts)) {
					finalAlerts.forEach((a: { pos: number; word: string; suggestions: string[]; score: number }, i: number) => {
						let Recruitembed = new Embed()
							.title('Recruit AIがミスだと思ったところ' + (i + 1))
							.description(
								`位置 (最初からの文字数): ${a.pos}\n単語: ${a.word}\n修正提案: ${a.suggestions.join(', ')}\n信頼度: ${(
									a.score * 100
								).toFixed(2)}%`
							);
						returnValue.push(Recruitembed);
					});
				}
				const askembed = new Embed()
					.title(`メールチェックをしてください。`)
					.description(BossId)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(askembed);
				const bodyEmbed = new Embed()
					.title(`本文`)
					.description(c.var.メール本文)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(bodyEmbed);
				return await c.followup({ embeds: returnValue });
			}
		} catch (error) {
			console.error(error);
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.command('register', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			let BossId = c.var.直属の上司;
			const userId = c.interaction?.user?.id || c.interaction?.member?.user?.id;
			await c.env.gakusai_user_kv.put(userId, BossId);
			return await c.followup(`<@${userId}>直属の上司の設定が完了しました。`);
		} catch (error) {
			console.error(error);
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.command('namereg', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			let Name = c.var.氏名;
			const userId = c.interaction?.user?.id || c.interaction?.member?.user?.id;
			await c.env.gakusai_name_kv.put(userId, Name);
			return await c.followup(`<@${userId}>本名の設定が完了しました。`);
		} catch (error) {
			console.error(error);
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.command('reminderset', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			const content = c.var.内容 as string;
			const timeStr = c.var.時間 as string;
			const channel = c.var.リマインド先 as string;
			const userId = c.interaction?.user?.id || c.interaction?.member?.user?.id;

			if (!userId) {
				return c.followup({
					embeds: [
						new Embed()
							.title('エラー')
							.description('ユーザーIDが取得できませんでした。')
							.timestamp(new Date().toISOString())
							.color(0xff0000)
							.footer({ text: 'リマインダー' }),
					],
				});
			}

			if (!content || !timeStr || !channel) {
				return c.followup({
					embeds: [
						new Embed()
							.title('エラー')
							.description('内容、時間、リマインド先が全て指定されていません。')
							.timestamp(new Date().toISOString())
							.color(0xff0000)
							.footer({ text: 'リマインダー' }),
					],
				});
			}

			// 時間形式の検証 (yyyy-mm-dd-hh-mm)
			const timeRegex = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/;
			if (!timeRegex.test(timeStr)) {
				return c.followup({
					embeds: [
						new Embed()
							.title('エラー')
							.description('時間は yyyy-mm-dd-hh-mm の形式で指定してください。')
							.timestamp(new Date().toISOString())
							.color(0xff0000)
							.footer({ text: 'リマインダー' }),
					],
				});
			}

			const reminder: Reminder = {
				content,
				time: timeStr,
				channel,
				userId,
			};

			// KVストアに保存
			const key = `reminder:${timeStr}:${userId}`;
			await c.env.gakusai_reminder_kv.put(key, JSON.stringify(reminder));

			return await c.followup({
				embeds: [
					new Embed()
						.title('リマインダーを設定しました')
						.description(`内容: ${content}\n時間: ${timeStr}\nリマインド先: ${channel}`)
						.timestamp(new Date().toISOString())
						.color(0x00ff00)
						.footer({ text: 'リマインダー' }),
				],
			});
		} catch (error) {
			console.error(error);
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.component('delete-self', (c) => c.resDeferUpdate(c.followupDelete));

const APPID = 'dj00aiZpPW9xS1BmY1lSSXJqYSZzPWNvbnN1bWVyc2VjcmV0Jng9NmE-';
const url = 'https://jlp.yahooapis.jp/KouseiService/V2/kousei';

async function post(emailBody: string): Promise<PostResult> {
	const headers = {
		'Content-Type': 'application/json',
		'User-Agent': `Yahoo AppID: ${APPID}`,
	};

	const body = JSON.stringify({
		id: '1234-1',
		jsonrpc: '2.0',
		method: 'jlp.kouseiservice.kousei',
		params: {
			q: emailBody,
		},
	});

	const response = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: body,
	});

	const result = (await response.json()) as any;
	return formatResult(result, emailBody);
}

function formatResult(result: unknown, originalText: string): PostResult {
	const safeResult = result as any;
	const suggestions: Suggestion[] = Array.isArray(safeResult.result?.suggestions) ? safeResult.result.suggestions : [];

	const details = suggestions.map((s: any) => ({
		word: s.word,
		suggestion: s.suggestion || '',
		note: s.note || '',
		rule: s.rule || '',
	}));

	const validSuggestions = suggestions.filter((s: any) => s.suggestion);

	const modifiedText = validSuggestions.reduce((text: string, suggestion: any) => {
		const start = parseInt(suggestion.offset, 10);
		const end = start + parseInt(suggestion.length, 10);
		return text.slice(0, start) + suggestion.suggestion + text.slice(end);
	}, originalText);

	const alerts = Array.isArray(safeResult.result?.alerts) ? safeResult.result.alerts : undefined;
	const status = typeof safeResult.result?.status === 'number' ? safeResult.result.status : undefined;
	return { modifiedText, details, alerts, status };
}

async function get(emailBody: string): Promise<PostResult> {
	const body = emailBody;
	const apiKey = 'ZZPuxCVRtwO1ssGR4Q9diPZxteWU09Cr';
	const recruiturl = `https://api.a3rt.recruit.co.jp/proofreading/v2/typo?apikey=${apiKey}&sentence=${body}`;
	const response = await fetch(recruiturl, {
		method: 'GET',
	});
	const result = (await response.json()) as any;
	return {
		status: result.status || 0,
		alerts: result.alerts || [],
		modifiedText: result.modifiedText || emailBody,
		details: result.details || [],
	};
}

export default app;
