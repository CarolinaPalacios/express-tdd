import * as development from './development.js';
import * as staging from './staging.js';
import * as test from './testConfig.js';
import * as production from './production.js';

const configurations = {
  development,
  staging,
  test,
  production,
};

export default configurations;
