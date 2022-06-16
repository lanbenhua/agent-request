# agent

http agent base on origin fetch

## TODO

- race condition avoid
- cache management


## example

```
const createAgent = <T, U>(agentInit?: AgentInit<T, U>): Fetch => {
  const agent = new Agent(window.fetch.bind(window), agentInit);

  agent.interceptors.request.use(
    init => {
      if (!init.credentials) init.credentials = 'include';
      if (!init.contentType) init.contentType = ContentType.JSON;
      if (!init.responseType) init.responseType = ContentType.JSON;

      init.headers = {
        ...init.headers,
        'X-TEST-HEAD': 'x-test-head',
      };
      return init;
    },
    err => {
      return err;
    }
  );

  agent.interceptors.response.use(
    res => {
      if (!res.ok) {
        throw new Error(res.statusText ?? `${res.status} error`);
      }
      const data: ResponseVO<unknown> | undefined = res.data as
        | ResponseVO<unknown>
        | undefined;
      if (!data?.success) {
        throw new Error(data?.msg ?? 'Invalid error');
      }
      return res;
    },
    err => {
      return err;
    }
  );

  const fetcher = <T, U>(
    input: string,
    reqInit?: Partial<AgentReqInit<T, U>> & { noErrorHint?: boolean }
  ) => {
    const init: AgentReqInit<T, U> & { noErrorHint?: boolean } = {
      input,
      base: agentInit?.base,
      timeout: agentInit?.timeout,
      ...reqInit,
    };

    return agent
      .request<T, U>(init)
      .then(res => res?.data)
      .catch(err => {
        if (!init?.noErrorHint) {
          notification.error({
            type: 'error',
            message: err.name,
            description: (init.url ?? init.input) + ' ' + err.message,
          });
        }
        throw err;
      });
  };

  return fetcher;
};

export { createAgent };

export default createAgent<unknown, unknown>({
  base: '/test_api_base_prefix',
  timeout: 30000,
  queue: { concurrency: 5 },
  retry: {
    delay: 100,
    maxTimes: 3,
    retryOn: (_, err) => !!err,
  },
});
```