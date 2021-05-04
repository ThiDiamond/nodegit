"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addedOrModifiedFiles = exports.changedFilesCommitWouldOverwrite = exports.tocDiff = exports.nameStatus = exports.diff = exports.FILE_STATUS = void 0;
var IndexModule_1 = require("./IndexModule");
var ObjectsModule_1 = require("./ObjectsModule");
var RefsModule_1 = require("./RefsModule");
var UtilsModule_1 = require("./UtilsModule");
exports.FILE_STATUS = {
    ADD: "A",
    MODIFY: "M",
    DELETE: "D",
    SAME: "SAME",
    CONFLICT: "CONFLICT",
};
var diff = function (hash1, hash2) {
    var a = hash1 === undefined ? IndexModule_1.toc() : ObjectsModule_1.commitToc(hash1);
    var b = hash2 === undefined ? IndexModule_1.workingCopyToc() : ObjectsModule_1.commitToc(hash2);
    return exports.tocDiff(a, b);
};
exports.diff = diff;
var nameStatus = function (dif) {
    return Object.keys(dif)
        .filter(function (p) { return dif[p].status !== exports.FILE_STATUS.SAME; })
        .reduce(function (ns, p) { return UtilsModule_1.setIn(ns, [p, dif[p].status]); }, {});
};
exports.nameStatus = nameStatus;
var tocDiff = function (receiver, giver, base) {
    var fileStatus = function (receiver, giver, base) {
        if (receiver === void 0) { receiver = ""; }
        if (giver === void 0) { giver = ""; }
        if (base === void 0) { base = ""; }
        var receiverPresent = !!receiver;
        var basePresent = !!base;
        var giverPresent = !!giver;
        if (receiverPresent && giverPresent && receiver !== giver) {
            if (receiver !== base && giver !== base)
                return exports.FILE_STATUS.CONFLICT;
            else
                return exports.FILE_STATUS.MODIFY;
        }
        else if (receiver === giver)
            return exports.FILE_STATUS.SAME;
        else if ((!receiverPresent && !basePresent && giverPresent) ||
            (receiverPresent && !basePresent && !giverPresent))
            return exports.FILE_STATUS.ADD;
        else if ((receiverPresent && basePresent && !giverPresent) ||
            (!receiverPresent && basePresent && giverPresent))
            return exports.FILE_STATUS.DELETE;
    };
    base = base || receiver;
    var paths = Object.keys(receiver)
        .concat(Object.keys(base))
        .concat(Object.keys(giver));
    var u = UtilsModule_1.unique(paths)
        //@ts-ignore
        .reduce(function (idx, p) {
        var dif = {
            status: fileStatus(receiver[p], giver[p], base[p]) || "",
            receiver: receiver[p],
            base: base[p],
            giver: giver[p],
        };
        return UtilsModule_1.setIn(idx, [p, dif]);
    }, {});
    return u;
};
exports.tocDiff = tocDiff;
var changedFilesCommitWouldOverwrite = function (hash) {
    var headHash = RefsModule_1.hash("HEAD");
    return UtilsModule_1.intersection(Object.keys(exports.nameStatus(exports.diff(headHash, undefined))), Object.keys(exports.nameStatus(exports.diff(headHash, hash))));
};
exports.changedFilesCommitWouldOverwrite = changedFilesCommitWouldOverwrite;
var addedOrModifiedFiles = function () {
    var headToc = RefsModule_1.hash("HEAD") ? ObjectsModule_1.commitToc(RefsModule_1.hash("HEAD")) : {};
    var wc = exports.nameStatus(exports.tocDiff(headToc, IndexModule_1.workingCopyToc()));
    return Object.keys(wc).filter(function (p) { return wc[p] !== exports.FILE_STATUS.DELETE; });
};
exports.addedOrModifiedFiles = addedOrModifiedFiles;
