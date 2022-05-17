import Promise from 'promise-polyfill';
import { fetch } from 'whatwg-fetch/fetch';

import Agent from "./agent";
import Queue from "./queue";
import Polling from "./polling";

export * from "./agent";
export * from "./queue";
export * from "./polling";


export {
  Queue,
  Polling,
  Promise,
  fetch
}

export default Agent;
