#folder-diff

Create unified diff patch file for two folders, usable for creating patches for using in mercurial or git even on folders which are not actually version controlled.

Internally uses [diff](https://www.npmjs.com/package/diff) package.

## Installation

    npm install folder-diff

 
## API

fdiff.folderPatch('output.patch', originalSourceDir, modifiedSourceDir,
{
    ignore : ['*.html'],
    prefix : "a/src/proj/"
});

## Test

    npm test