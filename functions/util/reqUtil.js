import { notBlank, toURL } from './stringUtil'


export default {
  /**
   * 从URL中提取参数
   * @param {Request} request Cloudflare pages 请求对象
   * @param {string} paramKey 要提取的参数key
   * @returns {*} 提取到的参数值
   */
  getSearchParam(request, paramKey) {
    let url = toURL(request.url);
    if (url) {
      return url.searchParams[paramKey];
    } else {
      return null;
    }
  },
  /**
   * 从URL中批量提取参数
   * @param {Request} request Cloudflare pages 请求对象
   * @param {Array} paramKeys 要提取的参数key数组,为空或空数组时返回全部
   * @returns {Map<string, *>} 提取到的参数值对象
   */
  getSearchParams(request, paramKeys) {
    const params = {},
      url = toURL(request.url);
    if (url) {
      const searchParams = url.searchParams;
      if (Array.isArray(paramKeys) && paramKeys.length > 0) {
        paramKeys.forEach(key => params[key] = searchParams.get(key));
      } else { // 未指定,返回全部
        searchParams.forEach((v, k) => params[k] = v);
      }
    }
    return params;
  },
  /**
   * 从请求体中提取参数
   * @param {Request} request Cloudflare pages 请求对象
   * @param {string} paramKey 要提取的参数key,为空或空数组时返回全部
   * @returns {*} 提取到的参数值
   */
  async getBodyParam(request, paramKey) {
    if (!request.body) {
      console.log(`无body数据, 忽略提取bodyParam`)
      return null;
    }
    if (!request.headers.get('content-type')?.toLowerCase()?.startsWith('application/json')) {
      console.log(`content-type: ${request.headers.get('content-type')}, 忽略提取bodyParam`)
      return null;
    }
    try {
      return await request.json()?.[paramKey];
    } catch (e) {
      console.error('getBodyParam 异常', e);
      return null;
    }
  },
  /**
   * 从请求体中批量提取参数
   * @param {Request} request Cloudflare pages 请求对象
   * @param {Array} paramKeys 要提取的参数key数组
   * @returns {Map<string, *>} 提取到的参数值对象
   */
  async getBodyParams(request, paramKeys) {
    const params = {};
    if (!request.body) {
      console.log(`无body数据, 忽略提取bodyParam`)
      return params;
    }
    if (!request.headers.get('content-type')?.toLowerCase()?.startsWith('application/json')) {
      console.log(`content-type: ${request.headers.get('content-type')}, 忽略提取bodyParam`)
      return params;
    }
    try {
      const body = await request.json();
      if (body) {
        if (Array.isArray(paramKeys) && paramKeys.length > 0) {
          paramKeys.forEach(key => params[key] = body[key]);
        } else { // 未指定,返回全部
          Object.assign(params, body);
        }
      }
      return params;
    } catch (e) {
      console.error('getBodyParam 异常', e);
      return {};
    }
  },
  /**
   * 从请求中提取参数,先从url中提取,取不到再从请求体中提取
   * @param {Request} request Cloudflare pages 请求对象
   * @param {string} paramKey 要提取的参数key
   * @returns {*} 提取到的参数值
   */
  async getParam(request, paramKey) {
    let param = this.getSearchParam(request, paramKey);
    if (!param) {
      param = await this.getBodyParam(request, paramKey);
    }
    return param;
  },
  /**
   * 从请求体中批量提取参数,先从url中提取,取不到再从请求体中提取
   * @param {Request} request Cloudflare pages 请求对象
   * @param {Array} paramKeys 要提取的参数key数组,为空或空数组时返回全部
   * @returns {Map<string, *>} 提取到的参数值对象
   */
  async getParams(request, paramKeys) {
    let searchParams = this.getSearchParams(request, paramKeys),
      bodyParams = await this.getBodyParams(request, paramKeys),
      keys = [...Object.keys(searchParams), ...Object.keys(bodyParams)],
      params = {};

    // 哪个有值就用哪个
    keys.forEach(key => {
      let val = searchParams[key];
      if (val === null || val === undefined) {
        val = bodyParams[key];
      }
      params[key] = val;
    });
    return params;
  }
}