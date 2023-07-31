import authUtil from '../util/authUtil.js'
import reqUtil from '../util/reqUtil.js'
import resUtil from '../util/resUtil.js'
import Telegram from '../components/Telegram.js'

// 受支持的消息类型
const supportedMsgtypes = Object.keys(Telegram);

/**
 * 使用Telegram bot推送消息
 * @param {Context} cfContext Cloudflare pages 上下文
 * @returns {Response}
 */
export async function onRequest(cfContext) {
  const authRes = authUtil.tokenAuthResponse(cfContext);
  if (authRes) return authRes; // 有返回值说明验证未通过

  // 全部参数, 包括url和body中的
  const params = await reqUtil.getParams(cfContext.request);

  // 指定类型的处理函数, 默认text
  const sendHandler = Telegram[params.msgtype || 'text'];
  if (typeof sendHandler !== 'function') {
    return resUtil.initResponse(400, 400, `仅支持以下msgtype: ${supportedMsgtypes}`);
  }
  return await sendHandler(cfContext, params);
}