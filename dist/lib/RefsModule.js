"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitParentHashes = exports.headBranchName = exports.exists = exports.localHeads = exports.fetchHeadBranchToMerge = exports.rm = exports.write = exports.toRemoteRef = exports.toLocalRef = exports.isCheckedOut = exports.isHeadDetached = exports.hash = exports.terminalRef = exports.isRef = void 0;
var path_1 = require("path");
var fs_1 = require("fs");
var UtilsModule_1 = require("./UtilsModule");
var FilesModule_1 = require("./FilesModule");
var ObjectsModule_1 = require("./ObjectsModule");
var ConfigModule_1 = require("./ConfigModule");
var MergeModule_1 = require("./MergeModule");
var isRef = function (ref) {
    return ref !== undefined &&
        (ref.match("^refs/heads/[A-Za-z-]+$") ||
            ref.match("^refs/remotes/[A-Za-z-]+/[A-Za-z-]+$") ||
            ["HEAD", "FETCH_HEAD", "MERGE_HEAD"].indexOf(ref) !== -1);
};
exports.isRef = isRef;
var terminalRef = function (ref) {
    if (ref === void 0) { ref = ""; }
    if (ref === "HEAD" && !exports.isHeadDetached()) {
        var branch = FilesModule_1.read(FilesModule_1.nodegitPath("HEAD") || "");
        var isPointingAtBranch = branch.match("ref: (refs/heads/.+)");
        if (isPointingAtBranch && isPointingAtBranch.length >= 1)
            return isPointingAtBranch[1];
    }
    else if (exports.isRef(ref))
        return ref;
    else
        return exports.toLocalRef(ref);
};
exports.terminalRef = terminalRef;
var hash = function (refOrHash) {
    if (ObjectsModule_1.exists(refOrHash))
        return refOrHash;
    else {
        var _terminalRef = exports.terminalRef(refOrHash);
        if (_terminalRef === "FETCH_HEAD")
            return exports.fetchHeadBranchToMerge(exports.headBranchName());
        else if (exports.exists(_terminalRef))
            return FilesModule_1.read(FilesModule_1.nodegitPath(_terminalRef));
    }
};
exports.hash = hash;
var isHeadDetached = function () {
    return FilesModule_1.read(FilesModule_1.nodegitPath("HEAD")).match("refs") === null;
};
exports.isHeadDetached = isHeadDetached;
var isCheckedOut = function (branch) {
    return !ConfigModule_1.isBare() && exports.headBranchName() === branch;
};
exports.isCheckedOut = isCheckedOut;
var toLocalRef = function (name) { return "refs/heads/" + name; };
exports.toLocalRef = toLocalRef;
var toRemoteRef = function (remote, name) {
    return "refs/remotes/" + remote + "/" + name;
};
exports.toRemoteRef = toRemoteRef;
var write = function (ref, content) {
    if (ref === void 0) { ref = ""; }
    if (content === void 0) { content = ""; }
    if (exports.isRef(ref))
        FilesModule_1.write(FilesModule_1.nodegitPath(path_1.normalize(ref)), content);
};
exports.write = write;
var rm = function (ref) {
    if (exports.isRef(ref))
        fs_1.unlinkSync(FilesModule_1.nodegitPath(ref) || "");
};
exports.rm = rm;
var fetchHeadBranchToMerge = function (branchName) {
    return UtilsModule_1.lines(FilesModule_1.read(FilesModule_1.nodegitPath("FETCH_HEAD") || ""))
        .filter(function (l) { return l.match("^.+ branch " + branchName + " of"); })
        .map(function (l) { return (l.match("^([^ ]+) ") || "")[1]; })[0];
};
exports.fetchHeadBranchToMerge = fetchHeadBranchToMerge;
var localHeads = function () {
    return fs_1.readdirSync(path_1.join(FilesModule_1.nodegitPath() || "", "refs", "heads")).reduce(function (o, n) { return UtilsModule_1.setIn(o, [n, exports.hash(n) || ""]); }, {});
};
exports.localHeads = localHeads;
var exists = function (ref) {
    if (ref === void 0) { ref = ""; }
    return exports.isRef(ref) && fs_1.existsSync(FilesModule_1.nodegitPath(ref) || "");
};
exports.exists = exists;
var headBranchName = function () {
    if (!exports.isHeadDetached())
        return (FilesModule_1.read(FilesModule_1.nodegitPath("HEAD")).match("refs/heads/(.+)") || [])[1];
    return "";
};
exports.headBranchName = headBranchName;
var commitParentHashes = function () {
    var headHash = exports.hash("HEAD");
    if (MergeModule_1.isMergeInProgress())
        return [headHash || "", exports.hash("MERGE_HEAD") || ""];
    else if (!headHash)
        return [];
    else
        return [headHash];
};
exports.commitParentHashes = commitParentHashes;
