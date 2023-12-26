import authUtil from '../util/authUtil.js'

/**
 * 转发 Google Gemini Pro 的api请求
 * @param {Context} cfContext Cloudflare pages 上下文
 * @returns {Response}
 */
export async function onRequest(cfContext) {
  const authRes = authUtil.tokenAuthResponse(cfContext);
  if (authRes) return authRes; // 有返回值说明验证未通过

  // 转发到
  const url = new URL(cfContext.request.url);
  url.host = 'generativelanguage.googleapis.com';
  url.pathname = url.pathname.slice('/api/gemini'.length);
  return fetch(new Request(url, cfContext.request))
}