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
			console.log(modifiedText, details, details.length);

			// Embedの作成
			if (details.length == 0) {
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
					.description(`修正されたテキスト: ${modifiedText}`)
					.timestamp(new Date().toISOString())
					.color(0xffff00)
					.footer({ text: 'メールチェッカー' });
				returnValue.push(embed);
				details.forEach((d, i) => {
					let detailembed = new Embed()
						.title('AIがミスだと思ったところ' + (i + 1))
						.description(`単語: ${d.word}\n ルール: ${d.rule}\n 修正提案: ${d.suggestion || 'なし'}\n メモ: ${d.note || 'なし'}`);
					returnValue.push(detailembed);
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
				console.log(embed);
				// Embedを返す
				//@ts-ignore
				return await c.followup({ embeds: returnValue });
			}
		} catch (error) {
			console.error(error);
			// エラーハンドリング
			return await c.followup('エラーが発生しました。内容:' + error);
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
