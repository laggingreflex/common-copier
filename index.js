#!/usr/bin/env node

const fs = require('fs');
const mkdirSync = require('mkdirp').sync;
const path = require('path');
const yargs = require('yargs')
  .option('common', {
    alias: 'c',
    describe: 'dir/path of common folder'
  })
  .option('project', {
    alias: 'p',
    describe: 'dir/path of project folder'
  })
  .argv
const wrench = require('wrench');
const Diff = require('diff');

const commonDir = yargs.common || yargs._[0];
const projectDir = yargs.project || yargs._[1];

let missingArgErrors = 0;
if (!commonDir) {
  console.error('Required argument missing: --commonDir="xxx", -c "xxx", or 1st argument');
  missingArgErrors++;
}
if (!projectDir) {
  console.error('Required argument missing: --projectDir="xxx", -p "xxx", or 2nd argument');
  missingArgErrors++;
}
if (missingArgErrors) {
  process.exit(missingArgErrors);
}

const common = file => path.join(commonDir, file);
const project = file => path.join(projectDir, file);

console.log('Checking directories...');
let commonFiles, projectFiles, readDirErrors = 0;
try {
  console.log('Reading commonFiles...');
  commonFiles = wrench.readdirSyncRecursive(commonDir);
} catch (err) {
  console.error('Couldn\'t read commonDir.', err.message);
  readDirErrors++;
}
try {
  console.log('Reading projectDir...');
  fs.readdirSync(projectDir);
} catch (err) {
  console.error('Couldn\'t read projectDir.', err.message);
  readDirErrors++;
}
if (readDirErrors) {
  process.exit(readDirErrors);
}


const errs = [];
const diffFiles = [];
const sameFiles = [];
const noexFiles = [];
for (const file of commonFiles) {
  try {
    const commonFile = common(file);
    const projectFile = project(file);
    const commonFileText = fs.readFileSync(commonFile, 'utf8');
    try {
      var projectFileText = fs.readFileSync(projectFile, 'utf8');
    } catch (err) {
      noexFiles.push(file);
      continue;
    }
    const diffs = Diff.diffChars(commonFileText, projectFileText);
    let actualDiffs = [];
    for (const diff of diffs) {
      if (diff.added || diff.removed) {
        actualDiffs.push(diff);
      }
    }
    if (actualDiffs.length) {
      diffFiles.push({ file, diffs: actualDiffs });
    } else {
      sameFiles.push(file);
    }
  } catch (err) { errs.push({ file, err }) }
}

const linkableFiles = sameFiles.concat(noexFiles);
const linkErrs = [];

console.log('Creating files...');
for (const file of linkableFiles) {
  try {
    const commonFile = common(file);
    const projectFile = project(file);
    const projectFileBaseDir = path.dirname(projectFile);
    try {
      fs.readdirSync(projectFileBaseDir);
    } catch (err) {
      console.error('  Creating', projectFileBaseDir);
      try {
        mkdirSync(projectFileBaseDir);
      } catch (err) {
        console.error('  Couldn\'t create', projectFileBaseDir);
        throw err;
      }
    }
    try {
      fs.unlinkSync(projectFile);
    } catch (err) {
        // console.error('  Couldn\'t delete', projectFile);
        // throw err;
    }
    try {
      console.log('  Creating', projectFile);
      fs.linkSync(commonFile, projectFile);
    } catch (err) {
        console.error('  Couldn\'t create link', projectFile, '<<==>>', commonFile);
        throw err;
    }
  } catch (err) {
    linkErrs.push({ file, err })
  }
}

console.log('====================================');

console.log(`${linkableFiles.length-linkErrs.length}/${linkableFiles.length} linkable files re-linked`);
if (linkErrs.length) {
  console.error(`${linkErrs.length}/${linkableFiles.length} linkable files couldn't be re-linked`);
  for (const err of linkErrs) {
    console.error('  ', err.file, err.err.message);
  }
}

if (diffFiles.length) {
  console.log(`${diffFiles.length} files had some changes:`);
  for (const diffFile of diffFiles) {
    console.log('  ', diffFile.file);
  }
}
