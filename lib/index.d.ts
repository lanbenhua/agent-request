import Promise from 'promise-polyfill';
import { fetch } from 'whatwg-fetch/fetch';
import Agent from './agent';
import Queue from './queue';
export * from './agent';
export * from './queue';
export { Queue, Promise, fetch };
export default Agent;
