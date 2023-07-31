/*
 * 利用企业微信进行消息推送
 * 需要在 Cloudflare pages 中添加以下环境变量
 */
const ENV_REQUIRED = {
  Wechat_corpid: '企业ID',
  Wechat_agentId: '应用ID', // 使用哪个应用推送就填写哪个应用的
  Wechat_corpsecret: '应用Secret', // 使用哪个应用推送就填写哪个应用的
}
const ENV_OPTIONAL = {
  Wechat_touser: '消息接收用户' // 即向应用中哪个用户发送消息, 多个时以'|'分隔, 如 ZhangSan|LiSi|WangWu, 可被 send()方法的 touser 参数覆盖
}
const ENV_REQUIRED_KEYS = Object.keys(ENV_REQUIRED);

// 企业微信api
const api_base = 'https://qyapi.weixin.qq.com/cgi-bin';

// access_token 在 KV 中的key
const kvKey_accessToken = 'Wechat_accessToken';
// 默认消息类型
const MSG_TYPE = "text";

import resUtil from "../util/resUtil";
import { empty } from '../util/stringUtil'

/**
 * 获取 access_token
 * @param {boolean} refresh 是否重新调用接口刷新token, true:强制刷新, false:先从KV中获取,获取到则不刷新,未获取到则刷新
 * @returns {object} 查看函数定义中的 tokenRes 对象
 */
async function getAccesstoken(env, refresh = false) {
  const tokenRes = {
    token: null, // access_token 获取失败时为 null
    success: true, // 是否获取成功, true:成功, 判断依据: KV中取到了值 或者 企业微信接口errcode===0
    wechatCode: 0, // 企业微信接口errcode, 为 -1101 时表示接口异常
    wechatMsg: 'ok' // 企业微信接口errmsg
  };

  // 未指定强制刷新时, 首先从 KV 中获取缓存的 accessToken
  if (!refresh) {
    const accessToken = await env.pagesKV.get(kvKey_accessToken);
    if (accessToken) { // KV中获取到后直接返回
      tokenRes.token = accessToken;
      console.log('从KV中取到了 accessToken');
      return tokenRes;
    }
  }

  /* KV 中没有时调用企业微信的接口获取 接口响应如下
  {
    "errcode": 0,  // 出错返回码，为0表示成功，非0表示调用失败
    "errmsg": "ok", // 返回码提示语
    "access_token": "accesstoken000001", // 获取到的凭证，最长为512字节
    "expires_in": 7200 // 凭证的有效时间（秒）超时前每次都返回同一个值
  }
  */
  await fetch(`${api_base}/gettoken?corpid=${env.Wechat_corpid}&corpsecret=${env.Wechat_corpsecret}`, {
    method: 'GET'
  }).then(response => {
    return response.json();
  }).then(wechatResJson => {
    if (wechatResJson.errcode === 0) { // 成功了
      tokenRes.token = wechatResJson.access_token;
      // 向 KV 中存入一份
      env.pagesKV.put(kvKey_accessToken, wechatResJson.access_token, {
        type: 'text', // 类型,可忽略
        expirationTtl: wechatResJson.expires_in, // 超时时间,秒
      });
      console.log('access_token 获取成功, 并存入了KV')
    } else { // 失败了
      tokenRes.success = false;
      tokenRes.wechatCode = wechatResJson.errcode;
      tokenRes.wechatMsg = wechatResJson.errmsg;
      console.error('接口返回异常', wechatResJson);
    }
  }).catch(error => {
    tokenRes.success = false;
    tokenRes.wechatCode = -1101;
    tokenRes.wechatMsg = error.message;
    console.error('接口调用异常', error);
  });

  return tokenRes;
}

/**
 * 发送消息
 * 官方文档地址 https://developer.work.weixin.qq.com/document/path/90236
 * @param {object} params 请求参数
 * {
 *  msgtype {string} 消息类型, 默认 text,
 *  msgcontent {object} 消息体, msgtype不同时内部格式不同, 详情查看官方文档,
 *  touser {string} 发送给哪个账号, "@all":表示发给企业中所有人, "user1|user2", 默认使用环境变量 env.Wechat_touser,
 *  toparty {string} 发送到哪个部门的用户, "party1|party2", touser="@all"时无效,
 *  totag {string} 发送给哪个标签的用户, touser="@all"时无效,
 *  agentid {string} 应用ID,使用哪个应用发送消息, more使用环境变量 env.Wechat_agentId
 * }
 * @param {boolean} refresh 是否强制调用接口刷新 access_token
 * @param {number} retryNum 本次调用是第几次重试, 内部自行调用, 外部不要使用; 
 * @returns {Response} 发送结果
 */
async function send(cfContext, params, refresh = false, retryNum = 0) {
  const env = cfContext.env;

  let msg = '';
  ENV_REQUIRED_KEYS.forEach(k => {
    if (!env[k]) { msg = `${msg}${k} `; }
  })
  if (msg) return resUtil.initResponse(400, 400, `环境变量 ${msg}未配置`);

  if (!params || Object.entries(params) === 0) {
    return resUtil.initResponse(400, 400, '参数为空');
  }

  let msgtype = params.msgtype || MSG_TYPE,
    msgcontent = params.msgcontent,
    touser = params.touser;
  if (!touser && !env.Wechat_touser) {
    return resUtil.initResponse(400, 400, `touser 参数为空且未配置环境变量Wechat_touser`);
  }

  let accessToken, success, wechatTip, i = 0;

  do {
    ({ token: accessToken, success, ...wechatTip } = await getAccesstoken(cfContext.env, refresh));
  } while (++i <= 2 && (!success || !accessToken)); // 重试3次
  if (!success || !accessToken) { // 还是没获取到, 返回异常提示信息
    return resUtil.initResponse(401, wechatTip.wechatCode, `access_token 获取失败: ${wechatTip.wechatMsg}`);
  }

  // 实际调用发送消息接口
  return fetch(`${api_base}/message/send?access_token=${accessToken}`, {
    method: 'POST',
    body: JSON.stringify({
      "touser": params.touser || env.Wechat_touser, // 发送给哪个账号, "@all":表示发给企业中所有人, "user1|user2", 默认使用环境变量
      "toparty": params.toparty || undefined, // 发送到哪个部门的用户, "party1|party2", touser="@all"时无效
      "totag": params.totag || undefined, // 发送给哪个标签的用户, touser="@all"时无效
      "msgtype": msgtype, // 消息类型
      "agentid": params.agentid || env.Wechat_agentId, // 应用ID,使用哪个应用发送消息, more使用环境变量
      [msgtype]: msgcontent,
      "safe": 0, // 表示是否是保密消息，0表示可对外分享，1表示不能分享且内容显示水印，默认为0
      "enable_id_trans": 0, // 表示是否开启id转译，0表示否，1表示是，默认0。仅第三方应用需要用到，企业自建应用可以忽略。
      "enable_duplicate_check": 1, // 表示是否开启重复消息检查，0表示否，1表示是，默认0
      "duplicate_check_interval": 600 // 表示是否重复消息检查的时间间隔，默认1800s，最大不超过4小时
    }),
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  }).then(wechatRes => {
    return wechatRes.json();
  }).then(wechatResJson => {
    if (wechatResJson.errcode === 0) { // 发送成功
      return resUtil.initResponse(200, 0, '发送成功');
    }

    // access_token 失效, 递归调用重试两次
    if (wechatResJson.errcode === 40014 && retryNum <= 1) {
      return send(params, true, ++retryNum);
    }

    // 其他失败原因, 或者40014重试依旧失败后
    return resUtil.initResponse(500, wechatResJson.errcode, wechatResJson.errmsg);
  }).catch(e => {
    console.error('发送消息异常', e);
    return resUtil.initResponse(500, 500, e.message);
  });
}

  export default {

    /**
     * 发送纯文本消息
     * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
     * {
     *  content: '发送文本信息, 支持换行符\n 支持HTML的a标签(仅允许存在href属性), 最长不超过2048个字节,超出时被截断'
     * }
     * @returns {Response}
     */
    async text(cfContext, params) {
      // post传递json时正常结构, get传递时在url中拼接 '&msgcontent.content=消息内容'
      const msgText = params?.msgcontent?.content || params?.['msgcontent.content'];
      if (empty(msgText)) return resUtil.initResponseError_param('消息内容 msgcontet.content 为空');

      params.msgtype = 'text';
      params.msgcontent = {
        content: msgText
      };
      return await send(cfContext, params);
    },

    /**
     * 发送文本卡片消息
     * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
     * {
     *  title: '卡片标题 不超过128个字节',
     *  description: '描述，不超过512个字节,支持完整的HTML标签(不支持a标签)',
     *  url: '点击卡片后跳转的链接,最长2048字节，请确保包含了协议头(http/https)'
     * }
     * @returns {Response}
     */
    async textcard(cfContext, params) {
      // post传递json时正常结构, get传递时在url中拼接 '&msgcontent.xxx=内容'
      const title = params?.msgcontent?.title || params?.['msgcontent.title'],
        description = params?.msgcontent?.description || params?.['msgcontent.description'],
        url = params?.msgcontent?.url || params?.['msgcontent.url'];

      let errMsg = '';
      if (empty(title)) errMsg += 'msgcontent.title ';
      if (empty(description)) errMsg += 'msgcontent.description ';
      if (empty(url)) errMsg += 'msgcontent.url ';
      if (errMsg) return resUtil.initResponseError_param(`${errMsg}不能为空`);

      params.msgtype = 'textcard';
      params.msgcontent = {
        title: title,
        description: description,
        url: url,
        btntxt: "详情" // 默认详情
      };
      return await send(cfContext, params);
    },

    /**
     * 发送 Markdown 消息
     * 支持的Markdown语法地址: https://developer.work.weixin.qq.com/document/path/90236#10167/%E6%94%AF%E6%8C%81%E7%9A%84markdown%E8%AF%AD%E6%B3%95
     * @param {object} params 参数查看 {@link send} 函数, 对于 msgcontent 参数有如下要求
     * {
     *  content: 'markdown, 最长不超过2048个字节,超出时被截断'
     * }
     * @returns {Response}
     */
    async markdown(cfContext, params) {
      // post传递json时正常结构, get传递时在url中拼接 '&msgcontent.content=消息内容'
      const msgText = params?.msgcontent?.content || params?.['msgcontent.content'];
      if (empty(msgText)) return resUtil.initResponseError_param('消息内容 msgcontet.content 为空');

      params.msgtype = 'markdown';
      params.msgcontent = {
        content: msgText
      };
      return await send(cfContext, params);
    }
  }