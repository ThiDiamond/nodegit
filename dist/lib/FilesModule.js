"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenNestedTree = exports.nestFlatTree = exports.lsRecursive = exports.workingCopyPath = exports.nodegitPath = exports.read = exports.rmEmptyDirs = exports.writeFilesFromTree = exports.write = exports.pathFromRepoRoot = exports.assertInRepo = exports.inRepo = void 0;
var path_1 = require("path");
var UtilsModule_1 = require("./UtilsModule");
var fs_1 = __importDefault(require("fs"));
var os_1 = require("os");
var inRepo = function () { return exports.nodegitPath() !== undefined; };
exports.inRepo = inRepo;
var assertInRepo = function () {
    if (!exports.inRepo())
        throw new Error("not a nodegit repository");
};
exports.assertInRepo = assertInRepo;
var pathFromRepoRoot = function (path) {
    return path_1.relative(exports.workingCopyPath(path), path_1.join(process.cwd(), path));
};
exports.pathFromRepoRoot = pathFromRepoRoot;
var write = function (path, content) {
    if (path === void 0) { path = ""; }
    if (content === void 0) { content = ""; }
    var prefix = os_1.platform() === "win32" ? "." : "/";
    exports.writeFilesFromTree(UtilsModule_1.setIn({}, path.split(path_1.sep).concat(content)), prefix);
};
exports.write = write;
var writeFilesFromTree = function (tree, prefix) {
    Object.keys(tree).forEach(function (name) {
        var path = path_1.join(prefix, name);
        var isString = typeof tree[name] === "string";
        if (isString)
            fs_1.default.writeFileSync(path, tree[name]);
        else if (!fs_1.default.existsSync(path))
            fs_1.default.mkdirSync(path, "777");
        if (!isString)
            exports.writeFilesFromTree(tree[name], path);
    });
};
exports.writeFilesFromTree = writeFilesFromTree;
var rmEmptyDirs = function (path) {
    if (fs_1.default.statSync(path).isDirectory()) {
        fs_1.default.readdirSync(path).forEach(function (c) { return exports.rmEmptyDirs(path_1.join(path, c)); });
        if (fs_1.default.readdirSync(path).length === 0)
            fs_1.default.rmdirSync(path);
    }
};
exports.rmEmptyDirs = rmEmptyDirs;
var read = function (path) {
    if (path === void 0) { path = ""; }
    if (fs_1.default.existsSync(path))
        return fs_1.default.readFileSync(path, "utf8");
    return "";
};
exports.read = read;
var nodegitPath = function (path) {
    var nodegitDir = function (dir) {
        var _a;
        if (fs_1.default.existsSync(dir)) {
            var potentialConfigFile = path_1.join(dir, "config");
            var potentialnodegitPath = path_1.join(dir, ".nodegit");
            if (fs_1.default.existsSync(potentialConfigFile) &&
                fs_1.default.statSync(potentialConfigFile).isFile() &&
                ((_a = exports.read(potentialConfigFile)) === null || _a === void 0 ? void 0 : _a.match(/\[core\]/)))
                return dir;
            else if (fs_1.default.existsSync(potentialnodegitPath))
                return potentialnodegitPath;
            else if (dir !== "/")
                return nodegitDir(path_1.join(dir, ".."));
        }
    };
    var gDir = nodegitDir(process.cwd());
    if (gDir)
        return path_1.join(gDir, path || "");
};
exports.nodegitPath = nodegitPath;
var workingCopyPath = function (path) {
    if (path === void 0) { path = ""; }
    return path_1.join(path_1.join(exports.nodegitPath() || "", ".."), path);
};
exports.workingCopyPath = workingCopyPath;
var lsRecursive = function (path) {
    if (!fs_1.default.existsSync(path))
        return [];
    else if (fs_1.default.statSync(path).isFile())
        return [path];
    else if (fs_1.default.statSync(path).isDirectory())
        return fs_1.default
            .readdirSync(path)
            .reduce(function (fileList, dirChild) {
            return fileList.concat(exports.lsRecursive(path_1.join(path, dirChild)));
        }, []);
};
exports.lsRecursive = lsRecursive;
var nestFlatTree = function (obj) {
    return Object.keys(obj).reduce(function (tree, wholePath) {
        return UtilsModule_1.setIn(tree, wholePath.split(path_1.sep).concat(obj[wholePath]));
    }, {});
};
exports.nestFlatTree = nestFlatTree;
var flattenNestedTree = function (tree, obj, prefix) {
    if (!obj)
        return exports.flattenNestedTree(tree, {}, "");
    Object.keys(tree).forEach(function (dir) {
        var path = path_1.join(prefix, dir);
        if (typeof tree[dir] === "string")
            obj[path] = tree[dir];
        else
            exports.flattenNestedTree(tree[dir], obj, path);
    });
    return obj;
};
exports.flattenNestedTree = flattenNestedTree;
