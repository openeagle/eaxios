const eaxios = require('..');

const request = eaxios.create({
  baseURL: 'https://run.mocky.io/v3',
  timeout: 30000,
  transformResponse: [
    function (data, response) {
      if (typeof data === 'object') {
        if (data.code === 0) {
          return data.data;
        } else {
          throw eaxios.createError(data.message, data.code, response);
        }
      } else {
        throw eaxios.createError(
          data,
          response.config.responseError.SERVER_ERROR,
          response,
        );
      }
    },
  ],
});

request.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error && error.code) {
      if (error.code === 'UNKNOWN') {
        console.log('未知错误');
      } else if (error.code === 'REQUEST_OFFLINE') {
        console.log('网络未连接');
      } else if (error.code === 'REQUEST_TIMEOUT') {
        console.log('网络有点慢，请求超时了');
      } else if (error.code === 'SERVER_ERROR') {
        console.log('系统出问题了');
      } else if (error.code === 'RESPONSE_INVALID') {
        console.log('服务端 bug');
      } else if (error.code === '10000') {
        // 假设 10000 为登录会话过期
        console.log('登录会话失效');
      } else {
        console.log('根据情况是否要消息提示，还是外部处理')
      }
    }
    throw error;
  },
);

function printError(error) {
  console.log(
    `code: ${error.code}, name: ${error.name}, message: ${error.message}, isAxiosError: ${error.isAxiosError}, stack:\n${error.stack}`,
  );
}

function success() {
  console.log('>> success');
  return request('/4f503449-0349-467e-a38a-c804956712b7')
    .then((data) => {
      console.log('success', data);
    })
    .catch((error) => {
      printError(error);
    });
}

function failure() {
  console.log('>> failure');
  return request('/42d7c21d-5ae6-4b52-9c2d-4c3dd221eba4')
    .then((data) => {
      console.log('success', data);
    })
    .catch((error) => {
      printError(error);
    });
}

function invalid() {
  console.log('>> invalid');
  return request('/1b23549f-c918-4362-9ac8-35bc275c09f0')
    .then((data) => {
      console.log('success', data);
    })
    .catch((error) => {
      printError(error);
    });
}

function server_500() {
  console.log('>> server_500');
  return request('/2a9d8c00-9688-4d36-b2de-2dee5e81f5b3')
    .then((data) => {
      console.log('success', data);
    })
    .catch((error) => {
      printError(error);
    });
}

success().then(failure).then(invalid).then(server_500);
