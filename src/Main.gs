/**
 * エントリポイント。
 *   - dailyDigest()  : 毎朝のダイジェスト生成〜LINE 送信 (トリガーから呼ばれる)
 *   - setupTrigger() : 毎朝 7:00 JST のトリガーを登録 (初回のみ手動実行)
 *   - testRun()      : 手動デバッグ用 (Gmail ヒット件数と整形結果をログ出力)
 */

function dailyDigest() {
  const config = getConfig_();
  Logger.log('dailyDigest start: model=' + config.claudeModel);

  const candidates = fetchCandidateMessages_();
  Logger.log('Gmail candidates: ' + candidates.length);

  const hits = classifyCandidates_(candidates);
  Logger.log('Internship hits: ' + hits.length);

  if (hits.length === 0 && !config.notifyWhenEmpty) {
    Logger.log('No hits and notifyWhenEmpty=false, skipping LINE push.');
    markProcessed_(candidates);
    return;
  }

  const messages = formatDigestMessages_(hits);
  sendLinePush_(messages);
  markProcessed_(candidates);
  Logger.log('dailyDigest done.');
}

function markProcessed_(candidates) {
  const ids = candidates.map(c => c.messageId);
  if (ids.length > 0) saveProcessedIds_(ids);
}

function setupTrigger() {
  const config = getConfig_();
  const existing = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyDigest');
  existing.forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('dailyDigest')
    .timeBased()
    .atHour(config.digestHourJst)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();

  Logger.log('Trigger installed: dailyDigest, daily at ' + config.digestHourJst + ':00 JST');
}

function testRun() {
  const candidates = fetchCandidateMessages_();
  Logger.log('Candidates (' + candidates.length + '):');
  candidates.forEach(c => Logger.log(' - ' + c.subject + ' / ' + c.from));

  const hits = classifyCandidates_(candidates);
  Logger.log('Hits (' + hits.length + '):');
  hits.forEach(h => Logger.log(' - ' + JSON.stringify(h.extracted)));

  const messages = formatDigestMessages_(hits);
  messages.forEach((m, i) => Logger.log('[message ' + (i + 1) + ']\n' + m));
}
