const { CLI, command, option } = require('class-cli');
const Path = require('path');
const fs = require('fs-extra');
const streamEqual = require('stream-equal');
const SimpleGit = require('simple-git/promise');
const micromatch = require('micromatch');
const _ = require('./utils');

module.exports = class CommonCopier extends CLI {
  static path = ['~/.common-copier', '.common-copier'];

  link = command({
    command: 'link <commonDir> [projectDir]',
    description: 'Link files from commonDir to projectDir',
    handler: async function link() {
      await this.checkDirty();
      console.log(`Linking: '${this.projectDir}' <=> '${this.commonDir}'`);
      this.ignored = await this.processIgnores();
      this.isIgnored = micromatch.matcher(this.ignored, { contains: true });
      const commonDirFiles = await this.getFiles(this.commonDir);
      console.log(`${commonDirFiles.length} file(s) found in '${this.commonDir}'`);
      console.log('Classifying...');
      const { different, same, noExist, linked } = await this.classify(commonDirFiles);
      this.sampleLog(different, { title: `${different.length} different file(s) will be left untouched:`, prefix: '  [diff]' })
      this.sampleLog(same, { title: `${same.length} identical file(s) will be linked:`, prefix: '  [same]' })
      this.sampleLog(linked, { title: `${linked.length} file(s) are already linked:`, prefix: '  [link]' })
      this.sampleLog(noExist, { title: `${noExist.length} non-existing file(s) will be linked:`, prefix: '  [new] ' })
      const linkableFiles = same.concat(noExist);
      if (!linkableFiles.length) {
        console.log('No linkable files found');
        return;
      }
      console.log('From:', Path.resolve('.', this.commonDir));
      console.log('To->:', Path.resolve('.', this.projectDir));
      if (!await this.confirmProceed()) return;
      await this.create(linkableFiles);
      console.log('Done!');
    }
  });

  unlink = command({
    command: 'unlink [projectDir]',
    description: 'Dereference all symlinks',
    handler: async function unlink() {
      await this.checkDirty();
      this.ignored = await this.processIgnores();
      this.isIgnored = micromatch.matcher(this.ignored, {});
      const files = await this.getFiles(this.projectDir);
      console.log(`Unlinking ${files.length} file(s) in '${this.projectDir}'...`);
      if (!await this.confirmProceed()) return;
      await Promise.all(files.map(async org => {
        try {
          const temp = org + '_tmp';
          const bkp = org + '_bkp';
          await fs.copy(org, temp, { dereference: true });
          await fs.rename(org, bkp);
          await fs.rename(temp, org);
          await fs.remove(bkp);
          console.log(`Unlinked:`, org);
        } catch (error) {
          throw new Error(`Couldn't unlink '${org}'. ${error.message}`);
        }
      }));
    }
  });

  async checkDirty() {
    if (this.dirty) return;
    try {
      const git = SimpleGit(this.projectDir);
      const status = await git.status();
      if (!status.files || !status.files.length) {
        return;
      }
    } catch (error) {}
    throw new _.UserError(`Uncommitted local changes in the projectDir; Please commit/stash them, or use --dirty`);
  }

  processIgnores() {
    let ignored = _.unique(_.arrify(this.ignored));
    const gitignore = _.unique(_.arrify(this.gitignore))
      .map(p => _.adjustPath(p, { absolute: false }))
      .reduce((p, c) => {
        if (Path.isAbsolute(c)) {
          p.push(c);
        } else {
          p.push(...[
            this.commonDir && Path.join(this.commonDir, c),
            Path.join(this.projectDir, c)
          ].filter(Boolean));
        }
        return p;
      }, []);

    for (const gi of gitignore) {
      if (!fs.existsSync(gi)) continue;
      const str = fs.readFileSync(gi, 'utf8');
      let i = str.split(/[\n\r]+/g);
      i = i.map(i => i.trim());
      i = i.filter(Boolean);
      i = i.filter(i => !i.startsWith('#'));
      ignored.push(...i);
    }
    const antiIgnored = ignored.filter(i => !i.startsWith('!'));
    ignored = ignored.filter(i => i.startsWith);
    return ignored;
  }

  async classify(files) {
    const common = file => Path.join(this.commonDir, file);
    const project = file => Path.join(this.projectDir, file);

    const different = [];
    const same = [];
    const noExist = [];
    const linked = [];

    await Promise.all(files.map(async (file) => {
      const projectFile = project(file);
      const commonFile = common(file);
      // console.log({ file, projectFile, commonFile });
      try {
        await fs.access(projectFile, fs.constants.F_OK)
      } catch (noop) {
        noExist.push(file);
        return;
      }

      const [projectFileStats, commonFileStats] = await Promise.all([
        fs.stat(projectFile),
        fs.stat(commonFile),
      ]);
      if (projectFileStats.ino === commonFileStats.ino) {
        linked.push(file);
        return;
      }

      const isStreamEqual = await streamEqual(
        fs.createReadStream(projectFile),
        fs.createReadStream(commonFile)
      );

      if (isStreamEqual) {
        same.push(file);
      } else {
        different.push(file);
      }
    }));

    return { different, same, noExist, linked };
  }

  create(files) {
    return Promise.all(files.map(async file => {
      const commonFile = Path.join(this.commonDir, file);
      const projectFile = Path.join(this.projectDir, file);
      await fs.ensureDir(Path.dirname(projectFile));
      await fs.remove(projectFile);
      await fs.link(commonFile, projectFile);
      console.log(`Linked '${projectFile}' <==> '${commonFile}'`);
    }));
  }

  async getFiles(path) {
    let files = await this.readdir(path) || [];
    files = files.map(f => Path.relative(path, f));
    return files
  }

  isIgnored(...args) { return false }

  async readdir(path, { size = 0, start = +new Date } = {}) {
    if (!path) return;
    if (this.isIgnored(path)) return;

    const stats = await fs.stat(path);
    const isDirectory = stats.isDirectory();
    if (!isDirectory) return path;

    let files = await fs.readdir(path);
    size += files.length;
    if (size > this.fileLimit) {
      throw new _.UserError(`Files (${files.length}) exceeded --file-limit=${this.fileLimit}`)
    };
    files = files.map(p => Path.join(path, p));
    files = await Promise.all(files.map(p => this.readdir(p, { size })));
    files = files.filter(Boolean);
    files = files.flat();

    return files;
  }

  confirm(message, initial = false) {
    return this.constructor.prompt.confirm({ message, initial });
  }

  async confirmProceed() {
    if (this.dry || (!this.yes && !await this.confirm('Proceed', true))) {
      console.log('No changes were made.');
      return;
    } else return true;
  }

  sampleLog(collection, { title = '', prefix = '' } = {}) {
    if (!Object.keys(collection).length) return;
    if (title) console.log(title);
    for (const item of _.sample(collection, 10)) {
      console.log(...[prefix, item].filter(Boolean));
    }
  }



  /** @type {string} (From) common folder */
  commonDir = option({ type: 'string', required: !true, description: `(From) common folder` });

  /** @type {string} (To) project folder */
  projectDir = option({ type: 'string', default: '.', description: `(To) project folder` });

  /** @type {number} Limit on number of files */
  fileLimit = option({ type: 'number', default: 500, description: `Limit on number of files` });

  /** @type {array} dir(s)/file(s) to ignore (glob/wildcard) */
  ignored = option({ type: 'array', alias: ['i'], default: ['.git', '*node_modules*', 'dist'], description: `dir(s)/file(s) to ignore (glob/wildcard)` });

  /** @type {array} .gitignore(-like) files */
  gitignore = option({ type: 'array', default: ['~/.gitignore', '.gitignore'], description: `.gitignore(-like) files` });

  /** @type {boolean} Assume 'yes' for all prompts */
  yes = option({ type: 'boolean', alias: ['y'], description: `Assume 'yes' for all prompts` });

  /** @type {boolean} Do not make any changes (dry run) */
  dry = option({ type: 'boolean', alias: ['d'], description: `Do not make any changes (dry run)` });

  /** @type {boolean} Don't check for uncommitted local changes */
  dirty = option({ type: 'boolean', description: `Don't check for uncommitted local changes` });

  /** @type {array} Config files to load settings from */
  config = option({ type: 'array', default: ['~/.common-copier', '.common-copier'], description: `Config files to load settings from` });

  /** @type {string} Current working directory */
  cwd = option({ type: 'string', default: '<cwd>', description: `Current working directory` });

  /** @type {boolean} Show help */
  help = option({ type: 'boolean', alias: ['h'], description: `Show help` });

  /** @type {boolean} Don't log unnecessarily */
  silent = option({ type: 'boolean', alias: ['s'], description: `Don't log unnecessarily` });

  /** @type {boolean} Log debug messages */
  debug = option({ type: 'boolean', alias: ['d'], description: `Log debug messages` });
};
