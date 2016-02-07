var diff = require('diff');
var recursive = require('recursive-readdir');
var fs = require('fs');
var Promise = require('promise');
var path = require('path');

function relativeTo(folder) {
    var f = folder;
    return function (file) {
        var rel = path.relative(f, file);
        return rel;
    }
}

function list(folder, ignore) {
    return new Promise(function (resolve, reject) {
        recursive(folder, ignore, function (err, files) {
            if (err) {
                reject(err);
            } else {
                resolve(files.map(f => relativeTo(folder)(f))
                             .map(f => f.replace(/\\/g, '/')));
            }
        });
    });
}

function readLinesSync(filePath) {
    return fs.readFileSync(filePath, 'UTF-8').replace(/\n$/, '').split('\n');
}

function createDeletedFileHunk(filePath, headerPath) {
    var file_lines = readLinesSync(filePath);
    return createHunkFromStructuredPatch(
       {
           oldFileName: headerPath,
           newFileName: '/dev/null/',
           hunks: [{
               oldStart: -1,
               oldLines: file_lines.length,
               newStart: 0,
               newLines: 0,
               lines: file_lines.map(l => '-' + l)
           }]
       });
}

function createAddedFileHunk(filePath, headerPath){
    var file_lines = readLinesSync(filePath);
    return createHunkFromStructuredPatch(
       {
           oldFileName: '/dev/null/',
           newFileName: headerPath,
           hunks: [{
               oldStart: 0,
               oldLines: 0,
               newStart: 1,
               newLines: file_lines.length,
               lines: file_lines.map(l => '+' + l)
           }]
       });
}

function createHunkFromStructuredPatch(diff) {
    var lines = [];
    lines.push('--- ' + diff.oldFileName + '\t');
    lines.push('+++ ' + diff.newFileName + '\t');

    for (var i = 0; i < diff.hunks.length; i++) {
        var hunk = diff.hunks[i];
        lines.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
        lines.push.apply(lines, hunk.lines);
    }

    return lines.join('\n') + '\n';
}

function folderPatch(file, folderA, folderB, options) {
    fs.unlink(file, function (ignoreError) { });
    var prefix = options.prefix ? options.prefix : '';
    return new Promise(function (resolve, reject) {
        Promise.all([list(folderA, options.ignore), list(folderB, options.ignore)])
            .then(function (values) {
                var a = values.shift();
                var b = values.shift();
                createComparePairs(a, b, function (pathA, pathB) {
                    var patch = '';
                    if (pathA === null) {
                        patch = "diff added file " + path.join(folderB, pathB) + '\n';
                        patch += createAddedFileHunk(path.join(folderB, pathB), prefix + pathB)
                    } else if (pathB === null) {
                        patch = "diff removed file " + path.join(folderB, pathA) + '\n';
                        patch += createDeletedFileHunk(path.join(folderA, pathA), prefix + pathA)
                    } else {
                        patch = "diff " + path.join(folderA, pathA) + " " + path.join(folderB, pathB) + '\n';
                        var contenta = fs.readFileSync(path.join(folderA, pathA), 'UTF-8');
                        var contentb = fs.readFileSync(path.join(folderB, pathB), 'UTF-8');
                        if(contenta === contentb)
                            return;
                        var fileName = prefix + pathA;
                        var strDiff = diff.structuredPatch(fileName, fileName, contenta, contentb, '', '');
                        patch += createHunkFromStructuredPatch(strDiff);
                    }
                    console.log(pathA + ' <-> ' + pathB);
                    fs.appendFile(file, patch, function (err) {
                        reject(err);
                    });
                });
                resolve();
            });
    });
}

function createComparePairs(listA, listB, compare) {
    var la = listA.sort();
    var lb = listB.sort();

    var indexA = 0;
    var indexB = 0;
    var valA = la[indexA];
    var valB = lb[indexB];

    while (valA || valB) {
        if (valA === valB) {
            compare(valA, valB);
            indexA++;
            indexB++;
        } else if (valB == undefined || valA < valB) {
            compare(valA, null);
            indexA++;
        } else if (valA == undefined || valB < valA) {
            compare(null, valB);
            indexB++;
        }
        valA = la[indexA];
        valB = lb[indexB];
    }
}

module.exports = {
    createComparePairs: createComparePairs,
    folderPatch: folderPatch
}
