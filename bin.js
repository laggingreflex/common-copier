#!/usr/bin/env node

const Main = require('.');
const config = require('./config');
const utils = require('./utils');

try {
  config().then(Main).catch(utils.handleError)
} catch (error) {
  utils.handleError(error)
}
