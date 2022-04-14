// import Agent, { AgentInit, AgentReqInit } from './agent/agent';

// import { notification } from 'antd';
// import { API_PREFIX_PATH_WITH_SUB_ENV } from '_shared/constants';
// import cookie from '_shared/utils/cookie';
// import { isAdminPageFromLocation } from 'src/routes';
// import store from 'src/store';

// export const enum ErrorType {
//   Response = 'response',
//   ResponseData = 'responseData',
//   Error = 'error',
//   Unknown = 'unknown',
//   String = 'string',
// }

// type ResData<T> = {
//   code: number | string | null;
//   data: T | undefined;
//   msg: string;
//   requestId: string;
//   success: boolean;
//   timestamp: number;
// };

// export interface Fetch {
//   <T = unknown, U = unknown>(
//     input: string,
//     init?: Partial<AgentReqInit<U>>
//   ): Promise<T | undefined>;
// }

// function judgeError(e: unknown): ErrorType {
//   if (
//     (e as Response).status !== undefined &&
//     (e as Response).headers !== undefined &&
//     (e as Response).url !== undefined
//   ) {
//     return ErrorType.Response;
//   }
//   if (
//     (e as ResData<unknown>).success !== undefined &&
//     (e as ResData<unknown>).requestId !== undefined
//   ) {
//     return ErrorType.ResponseData;
//   }
//   if (e instanceof Error) {
//     return ErrorType.Error;
//   }
//   if (typeof e === 'string') return ErrorType.String;
//   return ErrorType.Unknown;
// }

// function judgeErrorIsType(e: unknown, type: ErrorType): boolean {
//   const judgeType = judgeError(e);
//   return type === judgeType;
// }

// const createAgent = (base?: string, fetchInit?: AgentInit): Fetch => {
//   const agent = new Agent(base, fetchInit);

//   agent.interceptors.request.use(
//     init => {
//       if (!init.headers) init.headers = {};

//       init.headers = {
//         ...init.headers,
//         'X-CSRF-TOKEN': cookie.getItem('CSRF-TOKEN') || '',
//         'x-datasuites-project-code': !isAdminPageFromLocation()
//           ? store.getState()?.currentProjectCode || ''
//           : '',
//       };

//       return init;
//     },
//     err => {
//       return Promise.reject(err);
//     }
//   );

//   agent.interceptors.response.use(
//     res => {
//       if (!res.ok) {
//         throw res.statusText;
//       }
//       const data: ResData<unknown> | undefined = res.data as
//         | ResData<unknown>
//         | undefined;
//       if (!data?.success) {
//         throw data?.msg || 'Invalid';
//       }
//       return res;
//     },
//     err => {
//       return Promise.reject(err);
//     }
//   );

//   return <T, U>(input: string, reqInit?: Partial<AgentReqInit<U>>) => {
//     const init = {
//       ...fetchInit,
//       base,
//       input,
//       ...reqInit,
//     };

//     return agent
//       .request<T, U>(init)
//       .then(res => res?.data)
//       .catch(err => {
//         console.log('[fetch] catch error:', err);
//         if (!init?.skipErrorNotification) {
//           const errorMsg =
//             (judgeErrorIsType(err, ErrorType.Response)
//               ? err.statusText
//               : judgeErrorIsType(err, ErrorType.ResponseData)
//               ? err.msg
//               : judgeErrorIsType(err, ErrorType.Error)
//               ? err.message
//               : judgeErrorIsType(err, ErrorType.String)
//               ? err
//               : 'Invalid') || 'Invalid';
//           notification.error({ message: errorMsg });
//         }

//         throw err;
//       });
//   };
// };

// export { createAgent };

// export default createAgent(API_PREFIX_PATH_WITH_SUB_ENV, {
//   includeAbort: true,
//   timeout: 20000,
// });
