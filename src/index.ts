import Promise from 'promise-polyfill';
import { fetch } from 'whatwg-fetch/fetch';

import Agent from './agent';

export * from './agent';

export { Promise, fetch };

export default Agent;
