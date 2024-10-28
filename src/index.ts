import { DiscordHono, CommandContext, Embed } from 'discord-hono';
// DiscordHonoアプリの初期化
const app = new DiscordHono();

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
}
app.command('mailself', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			// メール本文が未定義の場合のエラーメッセージ
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

			// チェック結果を取得
			const { modifiedText, details } = await post(c.var.メール本文);
			//@ts-ignore
			const res = await get(c.var.メール本文);
			//@ts-ignore
			const { status, alerts } = res;
			// Embedの作成
			if (details.length == 0 && status == 0) {
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
				// Embedを返す
				//@ts-ignore
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
				//@ts-ignore
				alerts.forEach((a, i) => {
					let Recruitembed = new Embed()
						.title('Recruit AIがミスだと思ったところ' + (i + 1))
						.description(
							`位置 (最初からの文字数): ${a.pos}\n単語: ${a.word}\n修正提案: ${a.suggestions.join(', ')}\n信頼度: ${(a.score * 100).toFixed(
								2
							)}%`
						);
					returnValue.push(Recruitembed);
				});
				const warnembed = new Embed()
					.title('AIは完璧ではありません。')
					.description(`必ず人間のチェックを受けてください。`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				// Embedを返す
				returnValue.push(warnembed);

				// detailsが存在する場合、詳細情報をフィールドに追加
				//@ts-ignore
				console.log(returnValue);
				// Embedを返す
				//@ts-ignore
				return await c.followup({ embeds: returnValue });
			}
		} catch (error) {
			console.error(error);
			// エラーハンドリング
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.command('mailcheck', async (c: CommandContext) =>
	c.resDefer(async (c) => {
		try {
			// メール本文が未定義の場合のエラーメッセージ
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

			// チェック結果を取得
			const { modifiedText, details } = await post(c.var.メール本文);
			//@ts-ignore
			const res = await get(c.var.メール本文);
			//@ts-ignore
			const { status, alerts } = res;
			// Embedの作成
			if (details.length == 0 && status == 0) {
				const embed = new Embed()
					.title('メールをチェックしました。')
					.description(`AIはあなたの文章に指摘をしませんでした。`)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				const askembed = new Embed()
					.title(`メールチェックをしてください。`)
					.description(`<@&1300012682962796597>`)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });

				const bodyEmbed = new Embed()
					.title(`本文`)
					.description(c.var.メール本文)
					.timestamp(new Date().toISOString())
					.color(0x00ff00)
					.footer({ text: 'メールチェッカー' });
				// Embedを返す
				//@ts-ignore
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
				//@ts-ignore
				alerts.forEach((a, i) => {
					let Recruitembed = new Embed()
						.title('Recruit AIがミスだと思ったところ' + (i + 1))
						.description(
							`位置 (最初からの文字数): ${a.pos}\n単語: ${a.word}\n修正提案: ${a.suggestions.join(', ')}\n信頼度: ${(a.score * 100).toFixed(
								2
							)}%`
						);
					returnValue.push(Recruitembed);
				});
				const askembed = new Embed()
					.title(`メールチェックをしてください。`)
					.description(`<@&1300012682962796597>`)
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
				// detailsが存在する場合、詳細情報をフィールドに追加
				//@ts-ignore
				console.log(returnValue);
				// Embedを返す
				//@ts-ignore
				return await c.followup({ embeds: returnValue });
			}
		} catch (error) {
			console.error(error);
			// エラーハンドリング
			return await c.followup('エラーが発生しました。<@888011401040371712>内容:' + error);
		}
	})
);

app.component('delete-self', (c) => c.resDeferUpdate(c.followupDelete));

export default app;

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

	const result = await response.json();
	return formatResult(result, emailBody);
}

function formatResult(result: any, originalText: string): PostResult {
	const suggestions: Suggestion[] = result.result.suggestions || [];

	// Include all suggestions in details, even if they are empty strings
	const details = suggestions.map((s) => ({
		word: s.word,
		suggestion: s.suggestion || '',
		note: s.note || '',
		rule: s.rule || '',
	}));

	// Filter out empty suggestions for modifying the original text
	const validSuggestions = suggestions.filter((s) => s.suggestion);

	// If there are no valid suggestions, return the original text without modifications
	const modifiedText = validSuggestions.reduce((text, suggestion) => {
		const start = parseInt(suggestion.offset, 10);
		const end = start + parseInt(suggestion.length, 10);
		return text.slice(0, start) + suggestion.suggestion + text.slice(end);
	}, originalText);

	return { modifiedText, details };
}

async function get(emailBody: string): Promise<PostResult> {
	const body = emailBody;
	const apiKey = 'ZZPuxCVRtwO1ssGR4Q9diPZxteWU09Cr';
	const recruiturl = `https://api.a3rt.recruit.co.jp/proofreading/v2/typo?apikey=${apiKey}&sentence=${body}`;
	const response = await fetch(recruiturl, {
		method: 'GET',
	});
	const result = await response.json();
	//@ts-ignore
	return result;
}
