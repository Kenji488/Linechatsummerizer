/**
 * Claude API を使って、候補メール 1 件ごとに
 *   - インターン関連か否か
 *   - 企業名 / 職種 / 締切 / 要約 / 緊急度
 * を抽出する。
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * @param {Array} candidates fetchCandidateMessages_() の返り値
 * @returns {Array} インターン関連のみに絞られ、抽出フィールドが追加されたエントリ
 */
function classifyCandidates_(candidates) {
  const config = getConfig_();
  const hits = [];

  for (const c of candidates) {
    try {
      const result = classifyOne_(c, config);
      if (result && result.is_internship) {
        hits.push(Object.assign({}, c, { extracted: result }));
      }
    } catch (e) {
      Logger.log('Classify failed for messageId=' + c.messageId + ': ' + e);
    }
  }
  return hits;
}

function classifyOne_(candidate, config) {
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const systemPrompt =
    'あなたは就活生宛のメールを解析し、インターンシップの募集・締切情報のみを抽出するアシスタントです。' +
    'マーケティングや一般お知らせ、ES 添削サービスの宣伝、OB 訪問の勧誘などは is_internship=false とします。' +
    '本日の日付は ' + today + ' (JST) です。締切が相対表現 (例: 「来週金曜」) の場合は JST で ISO 形式 (YYYY-MM-DD) に変換してください。' +
    '明示的な締切情報がないメールは deadline を null にしてください。' +
    '必ず JSON のみを返してください。説明文や markdown フェンスは不要です。';

  const userContent =
    '以下のメールを分析してください。\n\n' +
    '件名: ' + candidate.subject + '\n' +
    '差出人: ' + candidate.from + '\n' +
    '受信日時: ' + Utilities.formatDate(candidate.date, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') + ' JST\n' +
    '本文:\n' + candidate.bodySnippet + '\n\n' +
    '次のスキーマで JSON を返してください:\n' +
    '{\n' +
    '  "is_internship": boolean,        // インターン募集 or 締切に関するメールか\n' +
    '  "company": string | null,        // 企業/団体名\n' +
    '  "position": string | null,       // 職種/プログラム名 (例: "サマーインターン", "エンジニア職 3days")\n' +
    '  "deadline": string | null,       // 締切 (ISO YYYY-MM-DD もしくは "YYYY-MM-DD HH:mm")\n' +
    '  "summary": string,               // 日本語で 1-2 文 (120 字以内) の要約\n' +
    '  "urgency": "high" | "medium" | "low" | "none"  // 締切までの余裕: 3日以内=high, 7日以内=medium, それ以外/不明=low or none\n' +
    '}';

  const payload = {
    model: config.claudeModel,
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userContent },
    ],
  };

  const response = UrlFetchApp.fetch(ANTHROPIC_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Anthropic API error ' + code + ': ' + text);
  }

  const body = JSON.parse(text);
  const raw = (body.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();

  return parseJsonLoose_(raw);
}

/**
 * Claude の応答から JSON オブジェクトを抜き出す。
 * まれに前後に余計なテキストが付く場合に備えて最初の '{' 〜 最後の '}' を抽出する。
 */
function parseJsonLoose_(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw e;
  }
}
