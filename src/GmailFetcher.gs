/**
 * Gmail から過去 24 時間のインターン関連候補メールを取得する。
 *
 * 第一段階のフィルタとしてキーワード検索 (newer_than:1d) を使い、
 * 返ってきたメッセージを Classifier に渡す前の中間表現に整形する。
 */

const SEARCH_QUERY =
  'newer_than:1d (' +
  [
    'インターン',
    'インターンシップ',
    'internship',
    '募集',
    'エントリー',
    '説明会',
    '締切',
    '締め切り',
    '締切り',
    'deadline',
    '選考',
  ].join(' OR ') +
  ')';

const MAX_THREADS = 50;
const BODY_CHAR_LIMIT = 2000;
const PROCESSED_IDS_KEY = 'PROCESSED_MESSAGE_IDS';
const PROCESSED_IDS_RETENTION = 500; // 直近 500 件だけ保持

/**
 * @returns {Array<{messageId: string, threadId: string, subject: string, from: string, date: Date, bodySnippet: string, permalink: string}>}
 */
function fetchCandidateMessages_() {
  const threads = GmailApp.search(SEARCH_QUERY, 0, MAX_THREADS);
  const processed = loadProcessedIds_();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const results = [];
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const msg of messages) {
      const id = msg.getId();
      if (processed.has(id)) continue;
      const date = msg.getDate();
      if (date < cutoff) continue;

      results.push({
        messageId: id,
        threadId: thread.getId(),
        subject: msg.getSubject() || '(件名なし)',
        from: msg.getFrom() || '',
        date: date,
        bodySnippet: truncateBody_(msg.getPlainBody() || ''),
        permalink: thread.getPermalink(),
      });
    }
  }
  return results;
}

function truncateBody_(body) {
  const normalized = body.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= BODY_CHAR_LIMIT) return normalized;
  return normalized.slice(0, BODY_CHAR_LIMIT) + '…(以下省略)';
}

function loadProcessedIds_() {
  const raw = getUserProps_().getProperty(PROCESSED_IDS_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch (e) {
    return new Set();
  }
}

function saveProcessedIds_(newlyProcessed) {
  const existing = Array.from(loadProcessedIds_());
  const combined = existing.concat(newlyProcessed);
  const trimmed = combined.slice(-PROCESSED_IDS_RETENTION);
  getUserProps_().setProperty(PROCESSED_IDS_KEY, JSON.stringify(trimmed));
}
