#!/usr/bin/env node

const CLI = require('.');
const cli = new CLI();
const _ = require('./utils');

cli.$init({
  yargs(yargs) {
    yargs.scriptName('common-copier');
    yargs.wrap(null);
  },
  promptCommand: true,
});

cli.$run()
.catch(_.logError);
