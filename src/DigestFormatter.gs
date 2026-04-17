/**
 * 分類済みインターン情報を LINE 送信用のテキストに整形する。
 * LINE 1 メッセージ上限 5000 字を超える場合は複数ブロックに分割する。
 */

const LINE_MAX_CHARS = 4800; // 5000 字の余裕をみる
const SEPARATOR = '\n─────────\n';

/**
 * @param {Array} hits classifyCandidates_() の返り値
 * @returns {Array<string>} LINE に送るメッセージ本文 (最大 5 件まで)
 */
function formatDigestMessages_(hits) {
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  const header = '📋 本日のインターン情報まとめ (' + today + ')\n';

  if (hits.length === 0) {
    return [header + '\n本日は該当する新着インターン情報はありませんでした。'];
  }

  const sorted = hits.slice().sort(compareByUrgency_);
  const blocks = sorted.map(formatOneBlock_);

  return chunkToMessages_(header, blocks);
}

function compareByUrgency_(a, b) {
  const order = { high: 0, medium: 1, low: 2, none: 3 };
  const ua = order[(a.extracted && a.extracted.urgency) || 'none'] ?? 3;
  const ub = order[(b.extracted && b.extracted.urgency) || 'none'] ?? 3;
  if (ua !== ub) return ua - ub;
  return (a.date < b.date) ? 1 : -1; // 新着優先
}

function formatOneBlock_(hit) {
  const e = hit.extracted || {};
  const urgencyMark = ({
    high: '🔥 ',
    medium: '⏰ ',
    low: '',
    none: '',
  })[e.urgency || 'none'] || '';

  const lines = [];
  const company = e.company || '(企業名不明)';
  const position = e.position ? ' / ' + e.position : '';
  lines.push(urgencyMark + '🏢 ' + company + position);
  lines.push('📅 締切: ' + (e.deadline || '記載なし'));
  if (e.summary) lines.push('📝 ' + e.summary);
  lines.push('🔗 ' + hit.permalink);
  return lines.join('\n');
}

function chunkToMessages_(header, blocks) {
  const messages = [];
  let current = header;
  for (let i = 0; i < blocks.length; i++) {
    const addition = (current === header ? '\n' : SEPARATOR) + blocks[i];
    if ((current + addition).length > LINE_MAX_CHARS) {
      messages.push(current);
      current = '(続き)\n' + blocks[i];
    } else {
      current += addition;
    }
  }
  if (current) messages.push(current);
  return messages.slice(0, 5); // LINE push は 1 リクエスト最大 5 件
}
