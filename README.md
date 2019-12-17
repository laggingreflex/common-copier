# Common Copier

Copy and maintain identical common code across different projects.

## Install

```sh
npm i -g common-copier
```

## Usage

```
common-copier <commonDir> [projectDir]

Link files from commonDir to projectDir

Commands:
  common-copier link <commonDir> [projectDir]  Link files from commonDir to projectDir  [default]
  common-copier unlink [projectDir]            Link files from commonDir to projectDir  [aliases: u]

Positionals:
  commonDir   (From) common folder [required]
  projectDir  (To) project folder  [default: "."]

Options:
  --help             Show help  [boolean]
  --version          Show version number  [boolean]
  --fileLimit        Limit on number of files  [default: 500]
  --timeLimit        Limit on seconds spent  [default: 10]
  --ignored, -i      dir(s)/file(s) to ignore (glob/wildcard)  [array] [default: [".git","*node_modules*","dist"]]
  --gitignore, --gi  choose/append --ignored files from .gitignore(-like) files  [array] [default: [".gitignore","~/.gitignore"]]
  --yes, -y          Don't prompt for confirmation  [boolean]
  --gitCheck         Check for uncommitted changes  [boolean] [default: true]
  --dry, -d          Do not make any changes (dry run)  [boolean]
```

## Example

Let's say you have a boilerplate and 2 projects based off of it:

```
./common-dir
└── utils.js // console.log('this is common code') // same in all

./project-dir1
├── index.js // console.log('this is project 1')
└── utils.js // console.log('this is common code') // same in all

./project-dir2
├── index.js // console.log('this is project 2')
└── utils.js // console.log('this is common code') // same in all
```

By doing this:

```sh
common-copier ./common-dir ./project-dir1
common-copier ./common-dir ./project-dir2
```

You'll get:

```
./project-dir1
├── index.js // console.log('this is project 1')
└── utils.js << hardlink >>

./project-dir2
├── index.js // console.log('this is project 2')
└── utils.js << hardlink >>

./common-dir
└── utils.js << hardlink >> // console.log('this is common code')
```

`./common-dir/utils.js` has been hardlinked across both projects. But `index.js` in either of the projects has stayed the same (because they were different).

Now you can manage the same `utils.js` from either your boilerplate (`common-dir`) or either of the `project-dir`s.

If at some point you decide you want your utils.js to be different in `project-dir1`, just destroy the hardlink and make your changes, then when you run it again it won't copy it anymore.


```
cp ./project-dir1/utils.js ./project-dir1/utils.tmp
rm ./project-dir1/utils.js
mv ./project-dir1/utils.tmp ./project-dir1/utils.js
echo changed >> ./project-dir1/utils.js

common-copier ./common-dir ./project-dir1
common-copier ./common-dir ./project-dir2

./project-dir1
├── index.js
└── utils.js // doesn't hardlinks now because it changed

./project-dir2
├── index.js // console.log('this is project 2')
└── utils.js << hardlink >> // still hardlinks because this one didn't change

./common-dir
└── utils.js << hardlink >>
```

In summary, it copies (makes hardlinks) of files\* from `common-dir` to the `project-dir`(s) **if**:

* both files are identical
* file doesn't exist in `project-dir`

## Warnings

Checking out files from Git may destroy hardlinks. Run `common-copier` again to maintain hardlinks.

Tested only on Windows. Let me know if you were able to use it in other OSes successfully. It uses [fs.link](https://nodejs.org/api/fs.html#fs_fs_link_existingpath_newpath_callback)
