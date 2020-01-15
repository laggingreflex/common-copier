# Common Copier

Copy and maintain identical common code across different projects.

## Install

```sh
npm i -g common-copier
```

## Usage

```
common-copier <commonDir> [projectDir=.]

Link files from commonDir to projectDir

Commands:
  common-copier <commonDir> [projectDir=.]     Link files from commonDir to projectDir  [default]
  common-copier unlink [projectDir=.]          Dereference all symlinks

Options:
  --help, -h     Show help  [boolean]
  --version      Show version number  [boolean]
  --commonDir    (From) common folder  [string]
  --projectDir   (To) project folder  [string] [default: "."]
  --fileLimit    Limit on number of files  [number] [default: 500]
  --ignored, -i  dir(s)/file(s) to ignore (glob/wildcard)  [array] [default: [".git","*node_modules*","dist"]]
  --gitignore    .gitignore(-like) files  [array] [default: ["~/.gitignore",".gitignore"]]
  --yes, -y      Assume 'yes' for all prompts  [boolean]
  --dry, -d      Do not make any changes (dry run)  [boolean]
  --dirty        Don't check for uncommitted local changes  [boolean]
  --config       Config files to load settings from  [array] [default: ["~/.common-copier",".common-copier"]]
  --cwd          Current working directory  [string] [default: "<cwd>"]
  --silent, -s   Don't log unnecessarily  [boolean]
  --debug, -d    Log debug messages  [boolean]
```

## Example

Let's say you have a boilerplate and 2 projects based off of it:

```
./common-dir
└── utils.js  ─────┐
                   │
./project-dir1     │
├── index.js       │
└── utils.js  ─────┤ common "utils.js" file
                   │
./project-dir2     │
├── index.js       │
└── utils.js  ─────┘
```

By doing this:

```sh
common-copier ./common-dir ./project-dir1
common-copier ./common-dir ./project-dir2
```

You'll get:

```
./common-dir
└── utils.js  ═════╗
                   ║
./project-dir1     ║
├── index.js       ║
└── utils.js  ═════╣ <hard-linked>
                   ║
./project-dir2     ║
├── index.js       ║
└── utils.js  ═════╝
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

Tested on Windows only. Uses [fs.link](https://nodejs.org/api/fs.html#fs_fs_link_existingpath_newpath_callback)
