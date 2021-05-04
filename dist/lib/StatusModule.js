"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toString = void 0;
var IndexModule_1 = require("./IndexModule");
var fs_1 = require("fs");
var FilesModule_1 = require("./FilesModule");
var RefsModule_1 = require("./RefsModule");
var ObjectsModule_1 = require("./ObjectsModule");
var DiffModule_1 = require("./DiffModule");
var UtilsModule_1 = require("./UtilsModule");
var toString = function () {
    var untracked = function () {
        return fs_1.readdirSync(FilesModule_1.workingCopyPath()).filter(function (p) { return !IndexModule_1.toc()[p] && p !== ".nodegit"; });
    };
    var toBeCommitted = function () {
        var headHash = RefsModule_1.hash("HEAD");
        var headToc = headHash === undefined ? {} : ObjectsModule_1.commitToc(headHash);
        var ns = DiffModule_1.nameStatus(DiffModule_1.tocDiff(headToc, IndexModule_1.toc()));
        return Object.keys(ns).map(function (p) { return ns[p] + " " + p; });
    };
    var notStagedForCommit = function () {
        var ns = DiffModule_1.nameStatus(DiffModule_1.diff(undefined, undefined));
        return Object.keys(ns).map(function (p) { return ns[p] + " " + p; });
    };
    var listing = function (heading, lines) {
        return lines.length > 0 ? [heading, lines] : [];
    };
    return UtilsModule_1.flatten([
        "On branch " + RefsModule_1.headBranchName(),
        listing("Untracked files:", untracked()).join(),
        listing("Unmerged paths:", IndexModule_1.conflictedPaths()).join(),
        listing("Changes to be committed:", toBeCommitted()).join(),
        listing("Changes not staged for commit:", notStagedForCommit()).join(),
    ]).join("\n");
};
exports.toString = toString;
