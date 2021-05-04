"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingFiles = exports.tocToIndex = exports.workingCopyToc = exports.write = exports._writeStageEntry = exports.writeRm = exports.writeConflict = exports.writeNonConflict = exports.conflictedPaths = exports.isFileInConflict = exports.key = exports.toc = exports.keyPieces = exports.read = exports.hasFile = void 0;
var FilesModule_1 = require("./FilesModule");
var UtilsModule_1 = require("./UtilsModule");
var ObjectsModule_1 = require("./ObjectsModule");
var fs_1 = require("fs");
var hasFile = function (path, stage) {
    return exports.read()[exports.key(path, stage)] !== undefined;
};
exports.hasFile = hasFile;
var read = function () {
    var indexFilePath = FilesModule_1.nodegitPath("index") || "";
    return UtilsModule_1.lines(fs_1.existsSync(indexFilePath) ? FilesModule_1.read(indexFilePath) : "\n").reduce(function (idx, blobStr) {
        var blobData = blobStr.split(/ /);
        idx[exports.key(blobData[0], parseInt(blobData[1]))] = blobData[2];
        return idx;
    }, {});
};
exports.read = read;
var keyPieces = function (key) {
    var pieces = key.split(/,/);
    return { path: pieces[0], stage: parseInt(pieces[1]) };
};
exports.keyPieces = keyPieces;
var toc = function () {
    var idx = exports.read();
    return Object.keys(idx).reduce(function (obj, k) { return UtilsModule_1.setIn(obj, [k.split(",")[0], idx[k]]); }, {});
};
exports.toc = toc;
var key = function (path, stage) { return path + "," + stage; };
exports.key = key;
var isFileInConflict = function (path) { return exports.hasFile(path, 2); };
exports.isFileInConflict = isFileInConflict;
var conflictedPaths = function () {
    return Object.keys(exports.read())
        .filter(function (k) { return exports.keyPieces(k).stage === 2; })
        .map(function (k) { return exports.keyPieces(k).path; });
};
exports.conflictedPaths = conflictedPaths;
var writeNonConflict = function (path, content) {
    if (content === void 0) { content = ""; }
    exports.writeRm(path);
    exports._writeStageEntry(path, 0, content);
};
exports.writeNonConflict = writeNonConflict;
var writeConflict = function (path, receiverContent, giverContent, baseContent) {
    if (baseContent !== undefined)
        exports._writeStageEntry(path, 1, baseContent);
    exports._writeStageEntry(path, 2, receiverContent);
    exports._writeStageEntry(path, 3, giverContent);
};
exports.writeConflict = writeConflict;
var writeRm = function (path) {
    var idx = exports.read();
    [0, 1, 2, 3].forEach(function (stage) {
        delete idx[exports.key(path, stage)];
    });
    exports.write(idx);
};
exports.writeRm = writeRm;
var _writeStageEntry = function (path, stage, content) {
    var idx = exports.read();
    idx[exports.key(path, stage)] = ObjectsModule_1.write(content);
    exports.write(idx);
};
exports._writeStageEntry = _writeStageEntry;
var write = function (index) {
    var indexStr = Object.keys(index)
        .map(function (k) { return k.split(",")[0] + " " + k.split(",")[1] + " " + index[k]; })
        .join("\n") + "\n";
    FilesModule_1.write(FilesModule_1.nodegitPath("index"), indexStr);
};
exports.write = write;
var workingCopyToc = function () { return Object.keys(exports.read())
    .map(function (k) { return k.split(",")[0]; })
    .filter(function (p) { return fs_1.existsSync(FilesModule_1.workingCopyPath(p)); })
    .reduce(function (idx, p) {
    idx[p] = UtilsModule_1.hash(FilesModule_1.read(FilesModule_1.workingCopyPath(p)));
    return idx;
}, {}); };
exports.workingCopyToc = workingCopyToc;
var tocToIndex = function (toc) {
    return Object.keys(toc).reduce(function (idx, p) { return UtilsModule_1.setIn(idx, [exports.key(p, 0), toc[p]]); }, {});
};
exports.tocToIndex = tocToIndex;
var matchingFiles = function (pathSpec) {
    var searchPath = FilesModule_1.pathFromRepoRoot(pathSpec);
    return Object.keys(exports.toc()).filter(function (p) {
        return p.match("^" + searchPath.replace(/\\/g, "\\\\"));
    });
};
exports.matchingFiles = matchingFiles;
