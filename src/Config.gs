/**
 * Script Properties からシークレットと設定値を取得するモジュール。
 *
 * 必須の Script Properties:
 *   ANTHROPIC_API_KEY         : Claude API キー
 *   LINE_CHANNEL_ACCESS_TOKEN : LINE Messaging API チャネルアクセストークン (長期)
 *   LINE_USER_ID              : 通知先 LINE ユーザー ID (U で始まる文字列)
 *
 * 任意 (未設定時はデフォルト値を使用):
 *   CLAUDE_MODEL              : 使用する Claude モデル ID
 *   DIGEST_HOUR_JST           : ダイジェスト送信時刻 (時) JST
 *   NOTIFY_WHEN_EMPTY         : 該当 0 件でも通知するか ('true' / 'false')
 */

const DEFAULTS = {
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  DIGEST_HOUR_JST: '7',
  NOTIFY_WHEN_EMPTY: 'true',
};

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const get = (key, fallback) => {
    const v = props.getProperty(key);
    return (v === null || v === '') ? fallback : v;
  };

  const required = ['ANTHROPIC_API_KEY', 'LINE_CHANNEL_ACCESS_TOKEN', 'LINE_USER_ID'];
  const missing = required.filter(k => !props.getProperty(k));
  if (missing.length > 0) {
    throw new Error(
      'Script Properties が未設定です: ' + missing.join(', ') +
      '\nGAS エディタの「プロジェクトの設定」→「スクリプト プロパティ」から登録してください。'
    );
  }

  return {
    anthropicApiKey: props.getProperty('ANTHROPIC_API_KEY'),
    lineChannelAccessToken: props.getProperty('LINE_CHANNEL_ACCESS_TOKEN'),
    lineUserId: props.getProperty('LINE_USER_ID'),
    claudeModel: get('CLAUDE_MODEL', DEFAULTS.CLAUDE_MODEL),
    digestHourJst: parseInt(get('DIGEST_HOUR_JST', DEFAULTS.DIGEST_HOUR_JST), 10),
    notifyWhenEmpty: get('NOTIFY_WHEN_EMPTY', DEFAULTS.NOTIFY_WHEN_EMPTY) === 'true',
  };
}

function getUserProps_() {
  return PropertiesService.getScriptProperties();
}
