/**
 * LINE Messaging API (push) でメッセージを送信する。
 * https://developers.line.biz/ja/reference/messaging-api/#send-push-message
 */

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * @param {Array<string>} texts 送信テキスト (最大 5 件)
 */
function sendLinePush_(texts) {
  if (!texts || texts.length === 0) return;
  const config = getConfig_();

  const payload = {
    to: config.lineUserId,
    messages: texts.slice(0, 5).map(t => ({ type: 'text', text: t })),
  };

  const response = UrlFetchApp.fetch(LINE_PUSH_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + config.lineChannelAccessToken,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('LINE push failed ' + code + ': ' + response.getContentText());
  }
  Logger.log('LINE push ok: ' + texts.length + ' message(s)');
}
