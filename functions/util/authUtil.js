// 从环境变量中获取预配置的 token
// 需要在 Cloudflare pages 中配置该环境变量, 用于对前端进行验证
const WEB_TOKEN_ENV_KEY = 'WEB_TOKEN';
// const WEB_TOKEN = env.WEB_TOKEN;

// 前端调用接口时传递 token 的key
const WEB_TOKEN_REQ_KEY = 'cf_token';


import resUtil from "./resUtil";

/**
 * 从前端请求中提取校验token
 * @param {Context} cfContext Cloudflare pages 的上下文
 * @returns {string} 提取到的前端提供的token
 */
function getWebTokenReq(cfContext) {
  const env = cfContext.env,
    request = cfContext.request;

  // 首先从 URL 中提取token
  let reqToken = new URL(request.url).searchParams.get(WEB_TOKEN_REQ_KEY);
  if (!reqToken) { // 未获取到时从请求头中获取
    reqToken = request.headers.get(WEB_TOKEN_REQ_KEY);
  }

  return reqToken;
}

export default {
  /**
   * 验证token, 返回验证结果
   * @param {Context} cfContext Cloudflare pages 的上下文对象, 通过 {@link getWebTokenReq} 函数提取前端提供的token
   * @param {boolean} withHttpCode 结果中是否带有 httpcode
   * @returns {object} 验证结果
   * {
   *  authed: true/false,
   *  authMsg: 验证结果说明,
   *  httpCode: 200 // 参数 withHttpCode=true 时带有该数据
   * }
   */
  tokenAuth(cfContext, withHttpCode = false) {
    const authRes = {
      authed: true,
      authMsg: '验证成功'
    };
    let httpCode;

    const env = cfContext.env,
      webTokenEnv = env[WEB_TOKEN_ENV_KEY], // 环境变量中配置的前端校验token
      webTokenReq = getWebTokenReq(cfContext); // 前端请求中提供的token

    if (!webTokenEnv) {
      httpCode = 500;
      authRes.authed = false;
      authRes.authMsg = `环境变量 ${WEB_TOKEN_ENV_KEY} 未配置`;
    } else {
      authRes.authed = webTokenEnv === webTokenReq;
      if (authRes.authed) {
        httpCode = 200;
        authRes.authMsg = `${WEB_TOKEN_REQ_KEY} 验证成功`;
      } else {
        httpCode = 401;
        authRes.authMsg = `${WEB_TOKEN_REQ_KEY} 验证失败`;
      }
    }

    if (withHttpCode) {
      authRes.httpCode = httpCode;
    }

    return authRes;
  },
  /**
   * 验证token，返回 Response
   * @param {Context} cfContext Cloudflare pages 的上下文对象
   * @returns {Response|null} 返回 Response 说明验证失败, 返回null则说明验证成功
   */
  tokenAuthResponse(cfContext) {
    const authResult = this.tokenAuth(cfContext, true);
    if (authResult.authed) {
      return null; // 验证成功,返回null
    }

    return resUtil.initResponse(authResult.httpCode, authResult.httpCode, authResult.authMsg);
  }

}