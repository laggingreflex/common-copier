# Common Copier

Copy and maintain identical boilerplate across projects.

If you have two almost identical projects that share a lot of the common code, this helps keep those common parts as **hardlink**s of each other. When you make changes to common code, it's replicated the other project(s) as well.

## Install

```sh
npm i common-copier
```

## Usage Example

Let's say there's 3 directories:

```sh
./project-dir1
└── index.js // console.log('this is project 1')

./project-dir2
└── index.js // console.log('this is project 2')

./common-dir
└── utils.js // console.log('this is common code')
```

```sh
common-copier --common ./common-dir --project ./project-dir1
common-copier --common ./common-dir --project ./project-dir2
```

```sh
./project-dir1
├── index.js // console.log('this is project 1')
└── utils.js << hardlink >>

./project-dir2
├── index.js // console.log('this is project 2')
└── utils.js << hardlink >>

./common-dir
└── utils.js << hardlink >> // console.log('this is common code')
```

It copies (makes hardlinks) of all files\* from `common-dir` to the `project-dir`(s).

\*It copies **only** files from the `common-dir` **if**:

* file in the `project-dir` doesn't exist
* or has no `diff` (i.e. both have same content)

As you can see in the above example `index.js` in both projects is still **different**. Any file whose diff isn't empty (theirr **contents are different**) are **not** hardlinked.
