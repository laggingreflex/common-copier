# Common Copier

## Description

If you have two almost identical projects, that share a lot of the common code, this helps keep those common parts as HARDLINKs so that if you make changes to common code, it's replicated the other project(s) as well.

## Usage Example

Take two directories:

* commonDir - which should contain the files that are common to both projects

* projectDir - which is the directory on which this script will execute on

```sh
common-copier -c ./common-dir -p ./project-dir
```

Let's suppose the structure for respective directories is as such:

```
./common-dir
└── base.js

./project-dir
└── index.js
```

It will go through each file in `common-dir` (recursively), let's say the file `./common-dir/base.js`, if it doesn't find `./project-dir/base.js` it will be hardlink-ed.

So the new structure would be like

```
./common-dir
└── base.js << hardlink >>

./project-dir
├── base.js << hardlink >>
└── index.js
```

If the hardlink gets broken for some reason, like by using Git and switching branches, when you run the script again and it finds that the file `./project-dir/base.js` already exists, it actually compares the `diff` to check whether the contents of the file have been altered or not. If not, it re-creates the hardlink. If the file actually has been altered, it just shows you the filename so that you can decide yourself. If you want the file from the `common` dir to override, you can simply delete  the file from `project` and run again, or if you decide to actually copy the changed file to `common`, then when you run the script again for a different project it'll let you decide again whether delete the outdated file from that project and copy the new file from `common`.

The direction of copy is always from `common` -> to `project` and only if either a file in `project` doesn't exist or the `diff` doesn't exist.

This way you can have two projects and a common "boilerplate".

```
./common-dir
└── base.js << hardlink >>

./project-A
├── base.js << hardlink >>
└── index.js

./project-B
├── base.js << hardlink >>
└── index.js
```






