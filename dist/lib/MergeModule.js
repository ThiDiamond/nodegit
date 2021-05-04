"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeNonFastForwardMerge = exports.writeFastForwardMerge = exports.writeIndex = exports.writeMergeMsg = exports.mergeDiff = exports.hasConflicts = exports.isAForceFetch = exports.canFastForward = exports.isMergeInProgress = exports.commonAncestor = void 0;
var IndexModule_1 = require("./IndexModule");
var RefsModule_1 = require("./RefsModule");
var UtilsModule_1 = require("./UtilsModule");
var ObjectsModule_1 = require("./ObjectsModule");
var DiffModule_1 = require("./DiffModule");
var FilesModule_1 = require("./FilesModule");
var ConfigModule_1 = require("./ConfigModule");
var WorkingCopyModule = __importStar(require("./WorkingCopyModule"));
var commonAncestor = function (aHash, bHash) {
    var sorted = [aHash, bHash].sort();
    aHash = sorted[0];
    bHash = sorted[1];
    var aAncestors = [aHash].concat(ObjectsModule_1.ancestors(aHash));
    var bAncestors = [bHash].concat(ObjectsModule_1.ancestors(bHash));
    return UtilsModule_1.intersection(aAncestors, bAncestors)[0];
};
exports.commonAncestor = commonAncestor;
var isMergeInProgress = function () { return RefsModule_1.hash("MERGE_HEAD"); };
exports.isMergeInProgress = isMergeInProgress;
var canFastForward = function (receiverHash, giverHash) { return receiverHash === undefined || ObjectsModule_1.isAncestor(giverHash, receiverHash); };
exports.canFastForward = canFastForward;
var isAForceFetch = function (receiverHash, giverHash) { return receiverHash !== undefined && !ObjectsModule_1.isAncestor(giverHash, receiverHash); };
exports.isAForceFetch = isAForceFetch;
var hasConflicts = function (receiverHash, giverHash) {
    var _mergeDiff = exports.mergeDiff(receiverHash, giverHash);
    return (Object.keys(_mergeDiff).filter(function (p) {
        return !UtilsModule_1.isString(_mergeDiff[p]) &&
            _mergeDiff[p].status === DiffModule_1.FILE_STATUS.CONFLICT;
    }).length > 0);
};
exports.hasConflicts = hasConflicts;
var mergeDiff = function (receiverHash, giverHash) {
    return DiffModule_1.tocDiff(ObjectsModule_1.commitToc(receiverHash), ObjectsModule_1.commitToc(giverHash), ObjectsModule_1.commitToc(exports.commonAncestor(receiverHash, giverHash)));
};
exports.mergeDiff = mergeDiff;
var writeMergeMsg = function (receiverHash, giverHash, ref) {
    var msg = ["Merge " + ref + " into " + RefsModule_1.headBranchName()];
    var _mergeDiff = exports.mergeDiff(receiverHash, giverHash);
    var conflicts = Object.keys(_mergeDiff).filter(function (p) { return _mergeDiff[p].status === DiffModule_1.FILE_STATUS.CONFLICT; });
    if (conflicts.length > 0)
        msg.push("\nConflicts:\n" + conflicts.join("\n"));
    FilesModule_1.write(FilesModule_1.nodegitPath("MERGE_MSG"), msg.join());
};
exports.writeMergeMsg = writeMergeMsg;
var writeIndex = function (receiverHash, giverHash) {
    var _mergeDiff = exports.mergeDiff(receiverHash, giverHash);
    IndexModule_1.write({});
    Object.keys(_mergeDiff).forEach(function (p) {
        if (_mergeDiff[p].status === DiffModule_1.FILE_STATUS.CONFLICT)
            IndexModule_1.writeConflict(p, ObjectsModule_1.read(_mergeDiff[p].receiver) || "", ObjectsModule_1.read(_mergeDiff[p].giver) || "", ObjectsModule_1.read(_mergeDiff[p].base));
        else if (_mergeDiff[p].status === DiffModule_1.FILE_STATUS.MODIFY)
            IndexModule_1.writeNonConflict(p, ObjectsModule_1.read(_mergeDiff[p].giver));
        else if (_mergeDiff[p].status === DiffModule_1.FILE_STATUS.ADD ||
            _mergeDiff[p].status === DiffModule_1.FILE_STATUS.SAME) {
            var content = ObjectsModule_1.read(_mergeDiff[p].receiver ||
                _mergeDiff[p].giver);
            IndexModule_1.writeNonConflict(p, content);
        }
    });
};
exports.writeIndex = writeIndex;
var writeFastForwardMerge = function (receiverHash, giverHash) {
    RefsModule_1.write(RefsModule_1.toLocalRef(RefsModule_1.headBranchName()), giverHash);
    IndexModule_1.write(IndexModule_1.tocToIndex(ObjectsModule_1.commitToc(giverHash)));
    if (!ConfigModule_1.isBare()) {
        var receiverToc = receiverHash === undefined ? {} : ObjectsModule_1.commitToc(receiverHash);
        var c = ObjectsModule_1.commitToc(giverHash);
        var t = DiffModule_1.tocDiff(receiverToc, c);
        WorkingCopyModule.write(t);
    }
};
exports.writeFastForwardMerge = writeFastForwardMerge;
var writeNonFastForwardMerge = function (receiverHash, giverHash, giverRef) {
    RefsModule_1.write("MERGE_HEAD", giverHash);
    exports.writeMergeMsg(receiverHash, giverHash, giverRef);
    exports.writeIndex(receiverHash, giverHash);
    if (!ConfigModule_1.isBare())
        WorkingCopyModule.write(exports.mergeDiff(receiverHash, giverHash));
};
exports.writeNonFastForwardMerge = writeNonFastForwardMerge;
