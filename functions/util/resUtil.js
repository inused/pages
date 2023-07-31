export default {
  /**
   * 生成一个 Response 对象
   * @param {number} httpCode http状态码, 默认200正常
   * @param {number} resCode 接口调用业务结果码, 默认0正常
   * @param {string} resMsg 接口调用业务提示信息
   * @param {object} extData 额外数据
   * @returns {Response} 生成一个 Response 对象
   */
  initResponse(httpCode, resCode, resMsg, extData) {
    return new Response(JSON.stringify({
      code: resCode || 0,
      msg: resMsg || 'ok',
      data: extData
    }), {
      status: httpCode || 200,
      // statustext: resMsg || 'ok',
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
  },

  /** 生成一个成功状态的 Response */
  initResponseSuccess(resMsg, extData) {
    return this.initResponse(200, 0, resMsg, extData);
  },

  /** 根据 error 生成响应对象 */
  errorHandler(error) {
    console.error('服务异常', error);
    const { message, stack } = error;
    return this.initResponse(500, 500, message, {
      stack: stack
    });
  },

  /** 生成参数异常的 Response */
  initResponseError_param(msg) {
    return this.initResponse(400, 400, msg);
  }

}
