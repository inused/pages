/*
 * 利用Telegram bot进行消息推送
 * 需要在 Cloudflare pages 中添加以下环境变量
 */
const ENV_REQUIRED = {
  Telegram_botToken: 'bot 的 token', // 通过 [@BotFather](https://t.me/BotFather)创建bot并获取token
}
const ENV_OPTIONAL = {
  Telegram_chatId: '与bot的会话ID' // 即给谁发消息，实际为目标用户的ID, 可被接口参数中的 chatId 覆盖
  // 可先给bot发送一条消息,访问 `https://api.telegram.org/bot${Telegram_botToken}/getUpdates`, 从响应中获取到ID
}
const ENV_REQUIRED_KEYS = Object.keys(ENV_REQUIRED);

const baseApi = 'https://api.telegram.org/bot'

import resUtil from '../util/resUtil'
import { empty } from '../util/stringUtil';

/**
 * 发送消息, 可查看官方文档 https://core.telegram.org/bots/api#sendmessage
 * @param {Context} cfContext Cloudflare pages 上下文
 * @param {Object} params 需要的参数信息
 * {
 *   parseMode {string} 消息格式,
 *   text {string} 消息内容,最长4096字符,
 *   parseMode {string} 消息格式,每种类型的限制请查看官方文档. 不指定时:默认字符串; MarkdownV2:Markdown语法的消息; HTML:html代码
 * }
 * @returns {Response} 响应
 */
async function send(cfContext, params) {
  const env = cfContext.env;

  let msg = '';
  ENV_REQUIRED_KEYS.forEach(k => {
    if (!env[k]) { msg = `${msg}${k} `; }
  })
  if (msg) return resUtil.initResponse(400, 400, `环境变量 ${msg}未配置`);

  if (!params || Object.entries(params) === 0) {
    return resUtil.initResponse(400, 400, '参数为空');
  }

  let parseMode = params.msgtype || undefined,
    msgtext = params.msgtext,
    chatId = params.chatId || env.Telegram_chatId;
  if (!chatId) {
    return resUtil.initResponse(400, 400, `chatId 参数为空且未配置环境变量Telegram_chatId`);
  }

  return fetch(`${baseApi}${cfContext.env.Telegram_botToken}/sendMessage?chat_id=${chatId}`, {
    method: 'POST',
    body: JSON.stringify({
      text: msgtext, // 消息内容,最大4096字符
      parse_mode: parseMode, // 消息格式
      disable_web_page_preview: true, // 禁用消息中HTML链接的预览
    }),
    headers: {
      "content-type": "application/json;charset=UTF-8",
    }
  }).then(TeleRes => {
    return TeleRes.json();
  }).then(TeleResJson => {
    if (TeleResJson.ok === true) { // 发送成功
      return resUtil.initResponse(200, 0, '发送成功');
    }

    // 失败
    return resUtil.initResponse(500, TeleResJson.errcode, TeleResJson.description);
  }).catch(e => {
    console.error('发送消息异常', e);
    return resUtil.initResponse(500, 500, e.message);
  });
}

/**
 * 对参数进行校验, Telegram 中消息格式是一样的,统一校验
 * @param {*} params 
 * @returns {Response|undefined} 返回undefined说明校验通过, 返回Response说明校验失败
 */
function paramCheck(params) {
  // post传递json时正常结构, get传递时在url中拼接 '&msgcontent.content=消息内容'
  const msgText = params?.msgcontent?.content || params?.['msgcontent.content'];
  if (empty(msgText)) return resUtil.initResponseError_param('消息内容 msgcontent.content 为空');

  // params.msgtype = undefined;
  params.msgtext = msgText;
}

export default {
  /**
   * 发送纯文本消息
   * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
   * {
   *  content: '发送文本信息, 最长不超过4096个字节,超出时被截断'
   * }
   * @returns {Response}
   */
  async text(cfContext, params) {
    const res = paramCheck(params);
    if (res) return res; // 返回值,验证未通过

    params.msgtype = undefined;
    return await send(cfContext, params);
  },

  /**
   * 发送Markdown消息
   * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
   * {
   *  content: 'Markdown消息, 最长不超过4096个字节,超出时被截断'
   * }
   * @returns {Response}
   */
  async markdown(cfContext, params) {
    const res = paramCheck(params);
    if (res) return res; // 返回值,验证未通过

    params.msgtype = 'MarkdownV2';
    return await send(cfContext, params);
  },

  /**
   * 发送HTML消息
   * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
   * {
   *  content: 'HTML源码,支持的标签有限制,具体查看官方文档, 最长不超过4096个字节,超出时被截断'
   * }
   * @returns {Response}
   */
  async html(cfContext, params) {
    const res = paramCheck(params);
    if (res) return res; // 返回值,验证未通过

    params.msgtype = 'HTML';
    return await send(cfContext, params);
  },
}