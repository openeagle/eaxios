import axios from 'axios';
import * as Axios from 'axios';
import enhanceError from 'axios/lib/core/enhanceError';

const EAXIOS_ERROR_CODE = {
  UNKNOWN: 'UNKNOWN',
  REQUEST_ABORTED: 'REQUEST_ABORTED',
  REQUEST_OFFLINE: 'REQUEST_OFFLINE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  RESPONSE_INVALID: 'RESPONSE_INVALID',
  // 其他业务错误码
};

function intercept(instance) {
  instance.interceptors.request.use(
    function (config) {
      // TODO: 如何继承默认值配置
      config.responseError = {
        ...EAXIOS_ERROR_CODE,
        ...instance.defaults.responseError,
        ...config.responseError,
      };

      if (config.responseType === 'json') {
        // 在发起请求前处理掉 json 类型的 responseType
        config._responseType = config.responseType;
        config.responseType = undefined;
        delete config.responseType;
      }

      if (config.transformResponse && config.transformResponse.length > 0) {
        // 在发起请求前处理掉 transformResponse
        config._transformResponse = config.transformResponse;
        config.transformResponse = [];
      }

      if (
        (config.method || '').toLowerCase() !== 'get' &&
        (config.headers['Content-Type'] || config.headers['content-type']) ===
          'application/x-www-form-urlencoded'
      ) {
        if (config.data && typeof config.data === 'object') {
          const searchParams = new URLSearchParams('');
          for (const key in config.data) {
            searchParams.append(key, config.data[key]);
          }
          config.data = searchParams.toString();
        } else {
          config.data = config.data || '';
        }
      }

      return config;
    },
    function (error) {
      return Promise.reject(error);
    },
  );
  instance.interceptors.response.use(
    function (response) {
      // 只有 validateStatus 为 true 的状态码才会进入该函数

      if (response.config._responseType) {
        // 还原 responseType
        response.config.responseType = response.config._responseType;
        delete response.config._responseType;
      }
      if (response.config._transformResponse) {
        // 还原 transformResponse
        response.config.transformResponse = response.config._transformResponse;
        delete response.config._transformResponse;
      }

      if (
        (response.status >= 200 &&
          response.status < 300 &&
          response.config.responseType === 'json') ||
        /^application\/json/i.test(response.headers['content-type'])
      ) {
        try {
          response.text = response.data;
          response.data = JSON.parse(response.data);
        } catch (error) {
          return Promise.reject(
            enhanceError(
              error,
              response.config,
              response.config.responseError.RESPONSE_INVALID,
              response.request,
              response,
            ),
          );
        }
      }

      try {
        if (
          Array.isArray(response.config.transformResponse) &&
          response.config.transformResponse.length > 0
        ) {
          return response.config.transformResponse.reduce(function (
            rcc,
            transform,
          ) {
            return transform(rcc, response);
          },
          response.data);
        }
      } catch (error) {
        return Promise.reject(
          error.isAxiosError
            ? error
            : enhanceError(
                error,
                response.config,
                String(
                  code === null || code === undefined
                    ? EAXIOS_ERROR_CODE.UNKNOWN
                    : code,
                ),
                response.request,
                response,
              ),
        );
      }
    },
    function (err) {
      // 取消、网络和超时等异常
      let error = err;
      if (err.isAxiosError && err.config) {
        if (!err.code && err.message === 'Network Error') {
          // 网络问题
          err.code = err.config.responseError.REQUEST_OFFLINE;
        } else if (
          err.code === 'ECONNABORTED' &&
          err.message.indexOf('timeout') >= 0
        ) {
          // 超时
          err.code = err.config.responseError.REQUEST_TIMEOUT;
        }
      } else if (err instanceof axios.Cancel) {
        // 取消
        error = enhanceError(
          new Error(err.message),
          undefined,
          'REQUEST_ABORTED', // TODO: 取消的网络请求无法读取配置
        );
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

function create() {
  const instance = axios.create();
  instance.defaults.responseType = 'json';
  instance.defaults.validateStatus = function (status) {
    // 取消、网络和超时情况的响应状态码为 0，为了统一在响应拦截器 then 中调用transformResponse，这里需要将 validateStatus 设置为 status 大于 0
    return status > 0; //
  };
  instance.defaults.transformResponse = [
    function (data, response) {
      if (response.status >= 400) {
        const error = new Error(response.data);
        error.code = response.config.responseError.SERVER_ERROR;
        throw error;
      }
      return data;
    },
  ];

  Object.keys(axios).forEach(function (key) {
    if (!instance[key]) {
      instance[key] = axios[key];
    }
  });

  instance.create = function (config) {
    const newInstance = create();
    Object.assign(newInstance.defaults, config);
    return newInstance;
  };
  instance.errorCodes = EAXIOS_ERROR_CODE
  instance.createError = function (message, code, response) {
    const error = new Error(message);
    error.code = String(
      code === null || code === undefined
        ? response.config.responseError.UNKNOWN
        : code,
    );
    if (response) {
      return enhanceError(
        error,
        response.config,
        error.code,
        response.request,
        response,
      );
    }
    return error;
  };

  return intercept(instance);
}

const eaxios = create();

module.exports = eaxios;
