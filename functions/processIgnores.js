const Path = require('path');
const untildify = require('untildify');
const arrify = require('arrify');
const _ = require('lodash')
const parseGitignore = require('parse-gitignore');

module.exports = async config => {
  let ignored = _.uniq(arrify(config.ignored.concat(config.defaults.ignored)));
  const gitignore = _.uniq(arrify(config.gitignore.concat(config.defaults.gitignore)))
    .map(untildify)
    .reduce((p, c) => {
      if (Path.isAbsolute(c)) {
        p.push(c);
      } else {
        p.push(...[
          config.commonDir && Path.join(config.commonDir, c),
          Path.join(config.projectDir, c)
        ].filter(Boolean));
      }
      return p;
    }, []);

  ignored.push.apply(ignored, _.flatten(gitignore.map(parseGitignore)));
  const antiIgnored = ignored.filter(i => i.charAt(0) === '!').map(i => i.substr(1));
  ignored = ignored.filter(i => i.charAt(0) !== '!');
  return ignored;
}