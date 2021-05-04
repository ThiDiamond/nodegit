"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitToc = exports.treeHash = exports.parentHashes = exports.ancestors = exports.isAncestor = exports.type = exports.allObjects = exports.read = exports.exists = exports.isUpToDate = exports.write = exports.wr = exports.writeCommit = exports.fileTree = exports.writeTree = exports.isTree = void 0;
var FilesModule_1 = require("./FilesModule");
var UtilsModule_1 = require("./UtilsModule");
var path_1 = require("path");
var fs_1 = require("fs");
var isTree = function (tree, key) {
    return tree[key] === undefined;
};
exports.isTree = isTree;
var writeTree = function (tree) {
    var treeObject = Object.keys(tree)
        .map(function (key) {
        return !exports.isTree(tree, key)
            ? "blob " + tree[key] + " " + key
            : "tree " + exports.writeTree(tree[key]) + " " + key;
    })
        .join("\n") + "\n";
    return exports.write(treeObject);
};
exports.writeTree = writeTree;
var fileTree = function (treeHash, tree) {
    if (treeHash === void 0) { treeHash = ""; }
    if (!tree)
        return exports.fileTree(treeHash, {});
    var objectStr = exports.read(treeHash);
    if (objectStr)
        UtilsModule_1.lines(objectStr).forEach(function (line) {
            var lineTokens = line.split(/ /);
            tree[lineTokens[2]] =
                lineTokens[0] === "tree" ? exports.fileTree(lineTokens[1], {}) : lineTokens[1];
        });
    return tree;
};
exports.fileTree = fileTree;
var writeCommit = function (treeHash, message, parentHashes) {
    return exports.write("commit " + treeHash + "\n" +
        parentHashes.map(function (h) { return "parent " + h + "\n"; }).join("") +
        ("Date:  " + new Date().toString() + "\n\n    " + message + "\n"));
};
exports.writeCommit = writeCommit;
var wr = function (treeHash, message, parentHashes) {
    return exports.write("commit " + treeHash + "\n" +
        parentHashes
            .split("")
            .map(function (h) { return "parent " + h + "\n"; })
            .join("") +
        ("Date:  " + new Date().toString() + "\n\n    " + message + "\n"));
};
exports.wr = wr;
var write = function (str) {
    if (str === void 0) { str = ""; }
    FilesModule_1.write(path_1.join(FilesModule_1.nodegitPath(), "objects", UtilsModule_1.hash(str)), str);
    return UtilsModule_1.hash(str);
};
exports.write = write;
var isUpToDate = function (receiverHash, giverHash) {
    return !!receiverHash &&
        (receiverHash === giverHash || exports.isAncestor(receiverHash, giverHash));
};
exports.isUpToDate = isUpToDate;
var exists = function (objectHash) {
    if (objectHash === void 0) { objectHash = ""; }
    return fs_1.existsSync(path_1.join(FilesModule_1.nodegitPath() || "", "objects", objectHash));
};
exports.exists = exists;
var read = function (objectHash) {
    if (objectHash === void 0) { objectHash = ""; }
    var objectPath = path_1.join(FilesModule_1.nodegitPath(), "objects", objectHash);
    if (fs_1.existsSync(objectPath))
        return FilesModule_1.read(objectPath);
};
exports.read = read;
var allObjects = function () {
    return fs_1.readdirSync(FilesModule_1.nodegitPath("objects") || "").map(exports.read);
};
exports.allObjects = allObjects;
var type = function (str) {
    if (str === void 0) { str = ""; }
    return ({ commit: "commit", tree: "tree", blob: "tree" }[str.split(" ")[0]] ||
        "blob");
};
exports.type = type;
var isAncestor = function (descendentHash, ancestorHash) {
    return exports.ancestors(descendentHash).indexOf(ancestorHash) !== -1;
};
exports.isAncestor = isAncestor;
var ancestors = function (commitHash) {
    var parents = exports.parentHashes(exports.read(commitHash)) || [];
    return UtilsModule_1.flatten(parents.concat(parents.map(exports.ancestors)));
};
exports.ancestors = ancestors;
var parentHashes = function (str) {
    if (str === void 0) { str = ""; }
    if (exports.type(str) === "commit")
        return str
            .split("\n")
            .filter(function (line) { return line.match(/^parent/); })
            .map(function (line) { return line.split(" ")[1]; });
};
exports.parentHashes = parentHashes;
var treeHash = function (str) {
    if (str === void 0) { str = ""; }
    if (exports.type(str) === "commit")
        return str.split(/\s/)[1];
};
exports.treeHash = treeHash;
var commitToc = function (hash) {
    if (hash === void 0) { hash = ""; }
    return FilesModule_1.flattenNestedTree(exports.fileTree(exports.treeHash(exports.read(hash))), {}, "");
};
exports.commitToc = commitToc;
