import reqUtil from './util/reqUtil.js';
import resUtil from './util/resUtil.js';

/**
 * 
 * 反向代理
 * 
 * @param {Context} cfContext Cloudflare pages 上下文
 * @returns {Response}
 */
export async function onRequest(cfContext) {
  // 反代目标
  const target = reqUtil.getSearchParam(cfContext.request, "target");
  console.log('cfContext =====', cfContext)
  console.log('cfContext.request ======', cfContext.request)
  console.log('cfContext.request.searchParams ======', cfContext.request.searchParams)
  if (!target) {
    return resUtil.initResponse(500, 500, 'target is required');
  }

  // 当前仅转发, 不对其他数据进行修改(如host/referer等)
  return await fetch(new Request(target, cfContext.request))
}