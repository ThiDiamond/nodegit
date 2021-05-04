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
exports.update_ref = exports.write_tree = exports.update_index = exports.clone = exports.status = exports.push = exports.pull = exports.merge = exports.fetch = exports.remote = exports.diff = exports.checkout = exports.branch = exports.commit = exports.rm = exports.add = exports.init = void 0;
var fs_1 = require("fs");
var path_1 = require("path");
var FilesModule_1 = require("./FilesModule");
var ConfigModule_1 = require("./ConfigModule");
var IndexModule_1 = require("./IndexModule");
var UtilsModule_1 = require("./UtilsModule");
var DiffModule_1 = require("./DiffModule");
var ObjectsModule_1 = require("./ObjectsModule");
var RefsModule_1 = require("./RefsModule");
var workingCopy = __importStar(require("./WorkingCopyModule"));
var MergeModule_1 = require("./MergeModule");
var StatusModule = __importStar(require("./StatusModule"));
var init = function (opts) {
    if (FilesModule_1.inRepo())
        return;
    var str = "";
    var nodegitStructure = {
        HEAD: "ref: refs/heads/main\n",
        config: ConfigModule_1.objToStr({
            core: { "": { bare: (!!opts.bare).toString() } },
        }),
        objects: {},
        refs: {
            heads: {},
        },
    };
    FilesModule_1.writeFilesFromTree(opts.bare ? nodegitStructure : { ".nodegit": nodegitStructure }, process.cwd());
};
exports.init = init;
var add = function (path) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var addedFiles = FilesModule_1.lsRecursive(path);
    if (addedFiles.length === 0)
        throw new Error(FilesModule_1.pathFromRepoRoot(path) + " did not match any files");
    else
        addedFiles.forEach(function (p) { return exports.update_index(p, { add: true }); });
};
exports.add = add;
var rm = function (path, opts) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var filesToRm = IndexModule_1.matchingFiles(path);
    if (opts.f)
        throw new Error("unsupported");
    else if (filesToRm.length === 0)
        throw new Error(FilesModule_1.pathFromRepoRoot(path) + " did not match any files");
    else if (fs_1.existsSync(path) && fs_1.statSync(path).isDirectory() && !opts.r)
        throw new Error("not removing " + path + " recursively without -r");
    else {
        var changesToRm = UtilsModule_1.intersection(DiffModule_1.addedOrModifiedFiles(), filesToRm);
        if (changesToRm.length > 0)
            throw new Error("these files have changes:\n" + changesToRm.join("\n") + "\n");
        else {
            filesToRm.map(FilesModule_1.workingCopyPath).filter(fs_1.existsSync).forEach(fs_1.unlinkSync);
            filesToRm.forEach(function (p) { return exports.update_index(p, { remove: true }); });
        }
    }
};
exports.rm = rm;
var commit = function (opts) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var _treeHash = exports.write_tree();
    var headDesc = RefsModule_1.isHeadDetached() ? "detached HEAD" : RefsModule_1.headBranchName();
    if (!!RefsModule_1.hash("HEAD") && _treeHash === ObjectsModule_1.treeHash(ObjectsModule_1.read(RefsModule_1.hash("HEAD"))))
        throw new Error("# On " + headDesc + "\nnothing to commit, working directory clean");
    else {
        var conflictedPaths = IndexModule_1.conflictedPaths();
        if (MergeModule_1.isMergeInProgress() && conflictedPaths.length > 0)
            throw new Error(conflictedPaths.map(function (p) { return "U " + p; }).join("\n") +
                "\ncannot commit because you have unmerged files\n");
        else {
            var m = MergeModule_1.isMergeInProgress()
                ? FilesModule_1.read(FilesModule_1.nodegitPath("MERGE_MSG"))
                : opts === null || opts === void 0 ? void 0 : opts.m;
            var commitHash = ObjectsModule_1.writeCommit(_treeHash, m, RefsModule_1.commitParentHashes());
            exports.update_ref("HEAD", commitHash);
            if (MergeModule_1.isMergeInProgress()) {
                fs_1.unlinkSync(FilesModule_1.nodegitPath("MERGE_MSG") || "");
                RefsModule_1.rm("MERGE_HEAD");
                return "Merge made by the three-way strategy";
            }
            else
                return "[" + headDesc + " " + commitHash + "] " + m;
        }
    }
};
exports.commit = commit;
var branch = function (name, opts) {
    FilesModule_1.assertInRepo();
    opts = opts || {};
    if (name === undefined)
        return (Object.keys(RefsModule_1.localHeads())
            .map(function (branch) { return (branch === RefsModule_1.headBranchName() ? "* " : "  ") + branch; })
            .join("\n") + "\n");
    else if (!RefsModule_1.hash("HEAD"))
        throw new Error(RefsModule_1.headBranchName() + " not a valid object name");
    else if (ObjectsModule_1.exists(RefsModule_1.toLocalRef(name)))
        throw new Error("A branch named " + name + " already exists");
    else
        exports.update_ref(RefsModule_1.toLocalRef(name), RefsModule_1.hash("HEAD"));
};
exports.branch = branch;
var checkout = function (ref) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var toHash = RefsModule_1.hash(ref) || "";
    if (!ObjectsModule_1.exists(toHash))
        throw new Error(ref + " did not match any file(s) known to Nodegit");
    else if (ObjectsModule_1.type(ObjectsModule_1.read(toHash)) !== "commit")
        throw new Error("reference is not a tree: " + ref);
    else if (ref === RefsModule_1.headBranchName() || ref === FilesModule_1.read(FilesModule_1.nodegitPath("HEAD")))
        return "Already on " + ref;
    else {
        var paths = DiffModule_1.changedFilesCommitWouldOverwrite(toHash);
        if (paths.length > 0)
            throw new Error("local changes would be lost\n" + paths.join("\n") + "\n");
        else {
            process.chdir(FilesModule_1.workingCopyPath());
            var isDetachingHead = ObjectsModule_1.exists(ref);
            workingCopy.write(DiffModule_1.diff(RefsModule_1.hash("HEAD"), toHash));
            RefsModule_1.write("HEAD", isDetachingHead ? toHash : "ref: " + RefsModule_1.toLocalRef(ref));
            IndexModule_1.write(IndexModule_1.tocToIndex(ObjectsModule_1.commitToc(toHash)));
            return isDetachingHead
                ? "Note: checking out " + toHash + "\nYou are in detached HEAD state."
                : "Switched to branch " + ref;
        }
    }
};
exports.checkout = checkout;
var diff = function (ref1, ref2) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    if (ref1 && !RefsModule_1.hash(ref1))
        throw new Error("ambiguous argument " + ref1 + ": unknown revision");
    else if (ref2 && !RefsModule_1.hash(ref2))
        throw new Error("ambiguous argument " + ref2 + ": unknown revision");
    else {
        var nameToStatus_1 = DiffModule_1.nameStatus(DiffModule_1.diff(RefsModule_1.hash(ref1), RefsModule_1.hash(ref2)));
        return (Object.keys(nameToStatus_1)
            .map(function (path) { return nameToStatus_1[path] + " " + path; })
            .join("\n") + "\n");
    }
};
exports.diff = diff;
var remote = function (command, name, path) {
    FilesModule_1.assertInRepo();
    if (command !== "add")
        throw new Error("unsupported");
    else if (name in ConfigModule_1.read()["remote"])
        throw new Error("remote " + name + " already exists");
    else {
        ConfigModule_1.write(UtilsModule_1.setIn(ConfigModule_1.read(), ["remote", name, "url", path]));
        return "\n";
    }
};
exports.remote = remote;
var fetch = function (remote, branch) {
    FilesModule_1.assertInRepo();
    if (!remote || !branch)
        throw new Error("unsupported");
    else if (!(remote in ConfigModule_1.read().remote))
        throw new Error(remote + " does not appear to be a git repository");
    else {
        var remoteUrl = ConfigModule_1.read().remote[remote].url;
        var remoteRef = RefsModule_1.toRemoteRef(remote, branch);
        var newHash = UtilsModule_1.onRemote(remoteUrl)(function () { return RefsModule_1.hash(branch); });
        if (newHash === undefined) {
            throw new Error("couldn't find remote ref " + branch);
        }
        else {
            var oldHash = RefsModule_1.hash(remoteRef);
            var remoteObjects = UtilsModule_1.onRemote(remoteUrl)(ObjectsModule_1.allObjects);
            remoteObjects.forEach(ObjectsModule_1.write);
            exports.update_ref(remoteRef, newHash);
            RefsModule_1.write("FETCH_HEAD", newHash + " branch " + branch + " of " + remoteUrl);
            return ([
                "From " + remoteUrl,
                "Count " + remoteObjects.length,
                branch + " -> " + remote + "/" + branch +
                    (MergeModule_1.isAForceFetch(oldHash, newHash) ? " (forced)" : ""),
            ].join("\n") + "\n");
        }
    }
};
exports.fetch = fetch;
var merge = function (ref) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var receiverHash = RefsModule_1.hash("HEAD") || "";
    var giverHash = RefsModule_1.hash(ref);
    if (RefsModule_1.isHeadDetached())
        throw new Error("unsupported");
    else if (!giverHash || ObjectsModule_1.type(ObjectsModule_1.read(giverHash)) !== "commit")
        throw new Error(ref + ": expected commit type");
    else if (ObjectsModule_1.isUpToDate(receiverHash, giverHash))
        return "Already up-to-date";
    else {
        var paths = DiffModule_1.changedFilesCommitWouldOverwrite(giverHash);
        if (paths.length > 0)
            throw new Error("local changes would be lost\n" + paths.join("\n") + "\n");
        else if (MergeModule_1.canFastForward(receiverHash, giverHash)) {
            MergeModule_1.writeFastForwardMerge(receiverHash, giverHash);
            return "Fast-forward";
        }
        else {
            MergeModule_1.writeNonFastForwardMerge(receiverHash, giverHash, ref);
            if (MergeModule_1.hasConflicts(receiverHash, giverHash))
                return "Automatic merge failed. Fix conflicts and commit the result.";
            //If there are no conflicted files, a commit is created from the merged changes and the merge is over.
            else
                return exports.commit({});
        }
    }
};
exports.merge = merge;
var pull = function (remote, branch) {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    exports.fetch(remote, branch);
    return exports.merge("FETCH_HEAD");
};
exports.pull = pull;
var push = function (remote, branch, opts) {
    FilesModule_1.assertInRepo();
    if (!remote || !branch)
        throw new Error("unsupported");
    else if (!(remote in ConfigModule_1.read().remote))
        throw new Error(remote + " does not appear to be a git repository");
    else {
        var remotePath = ConfigModule_1.read().remote[remote].url;
        var remoteCall_1 = UtilsModule_1.onRemote(remotePath);
        if (remoteCall_1(function () { return RefsModule_1.isCheckedOut(branch); }))
            throw new Error("refusing to update checked out branch " + branch);
        else {
            var receiverHash = remoteCall_1(RefsModule_1.hash);
            var giverHash = RefsModule_1.hash(branch) || "";
            if (ObjectsModule_1.isUpToDate(receiverHash, giverHash))
                return "Already up-to-date";
            else if (!opts.f && !MergeModule_1.canFastForward(receiverHash, giverHash))
                throw new Error("failed to push some refs to " + remotePath);
            else {
                ObjectsModule_1.allObjects().forEach(function (o) {
                    remoteCall_1(function () { return ObjectsModule_1.write(o); });
                });
                remoteCall_1(exports.update_ref);
                exports.update_ref(RefsModule_1.toRemoteRef(remote, branch), giverHash);
                return ([
                    "To " + remotePath,
                    "Count " + ObjectsModule_1.allObjects().length,
                    "branch -> " + branch,
                ].join("\n") + "\n");
            }
        }
    }
};
exports.push = push;
var status = function () {
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    return StatusModule.toString();
};
exports.status = status;
var clone = function (remotePath, targetPath, opts) {
    if (!remotePath || !targetPath)
        throw new Error("you must specify remote path and target path");
    else if (!fs_1.existsSync(remotePath) || !UtilsModule_1.onRemote(remotePath)(FilesModule_1.inRepo))
        throw new Error("repository " + remotePath + " does not exist");
    else if (fs_1.existsSync(targetPath) && fs_1.readdirSync(targetPath).length > 0)
        throw new Error(targetPath + " already exists and is not empty");
    else {
        remotePath = path_1.resolve(process.cwd(), remotePath);
        if (!fs_1.existsSync(targetPath))
            fs_1.mkdirSync(targetPath);
        UtilsModule_1.onRemote(targetPath)(function () {
            exports.init(opts);
            exports.remote("add", "origin", path_1.relative(process.cwd(), remotePath));
            var remoteHeadHash = UtilsModule_1.onRemote(remotePath)(function () { return RefsModule_1.hash("main"); });
            if (remoteHeadHash !== undefined) {
                exports.fetch("origin", "main");
                MergeModule_1.writeFastForwardMerge(undefined, remoteHeadHash);
            }
        });
        return "Cloning into " + targetPath;
    }
};
exports.clone = clone;
var update_index = function (path, opts) {
    if (path === void 0) { path = ""; }
    FilesModule_1.assertInRepo();
    ConfigModule_1.assertNotBare();
    var pathFromRoot = FilesModule_1.pathFromRepoRoot(path);
    var isOnDisk = fs_1.existsSync(path);
    var isInIndex = IndexModule_1.hasFile(path, 0);
    if (isOnDisk && fs_1.statSync(path).isDirectory())
        throw new Error(pathFromRoot + " is a directory - add files inside\n");
    else if (!!opts.remove && !isOnDisk && isInIndex)
        if (IndexModule_1.isFileInConflict(path))
            throw new Error("unsupported");
        else {
            IndexModule_1.writeRm(path);
            return "\n";
        }
    else if (!!opts.remove && !isOnDisk && !isInIndex)
        return "\n";
    else if (!opts.add && isOnDisk && !isInIndex)
        throw new Error("cannot add " + pathFromRoot + " to index - use --add option\n");
    else if (isOnDisk && (opts.add || isInIndex)) {
        IndexModule_1.writeNonConflict(path, FilesModule_1.read(FilesModule_1.workingCopyPath(path)));
        return "\n";
    }
    else if (!opts.remove && !isOnDisk)
        throw new Error(pathFromRoot + " does not exist and --remove not passed\n");
};
exports.update_index = update_index;
var write_tree = function () {
    FilesModule_1.assertInRepo();
    return ObjectsModule_1.writeTree(FilesModule_1.nestFlatTree(IndexModule_1.toc()));
};
exports.write_tree = write_tree;
var update_ref = function (refToUpdate, refToUpdateTo) {
    if (refToUpdate === void 0) { refToUpdate = ""; }
    if (refToUpdateTo === void 0) { refToUpdateTo = ""; }
    FilesModule_1.assertInRepo();
    var hash = RefsModule_1.hash(refToUpdateTo);
    if (!ObjectsModule_1.exists(hash))
        throw new Error(refToUpdateTo + " is not a valid SHA1");
    else if (!RefsModule_1.isRef(refToUpdate))
        throw new Error("cannot lock the ref " + refToUpdate);
    else if (ObjectsModule_1.type(ObjectsModule_1.read(hash)) !== "commit") {
        var branch_1 = RefsModule_1.terminalRef(refToUpdate);
        throw new Error(branch_1 + " cannot refer to non-commit object " + hash + "\n");
    }
    else
        RefsModule_1.write(RefsModule_1.terminalRef(refToUpdate), hash);
};
exports.update_ref = update_ref;
