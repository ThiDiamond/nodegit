"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRemote = exports.intersection = exports.unique = exports.flatten = exports.isString = exports.lines = exports.setIn = exports.hash = void 0;
var crypto_1 = __importDefault(require("crypto"));
var hash = function (string) {
    if (string === void 0) { string = ""; }
    if (!string)
        return string;
    var sha1 = crypto_1.default.createHash("sha1").update(string).digest("hex");
    return sha1;
};
exports.hash = hash;
var setIn = function (obj, arr) {
    if (arr.length === 2 && typeof arr[0] === "string")
        obj[arr[0]] = arr[1];
    else if (arr.length > 2 && typeof arr[0] === "string" && typeof obj[arr[0]]) {
        obj[arr[0]] = obj[arr[0]] || {};
        exports.setIn(obj[arr[0]], arr.slice(1));
    }
    return obj;
};
exports.setIn = setIn;
var lines = function (str) { return str.split("\n").filter(function (l) { return l !== ""; }); };
exports.lines = lines;
var isString = function (arr) {
    return typeof arr === "string";
};
exports.isString = isString;
var flatten = function (arr) {
    return arr.reduce(function (a, e) { return a.concat(e instanceof Array ? exports.flatten(e) : e); }, []);
};
exports.flatten = flatten;
var unique = function (arr) {
    return arr.reduce(function (a, p) { return (a.indexOf(p) === -1 ? a.concat(p) : a); }, []);
};
exports.unique = unique;
var intersection = function (a, b) {
    return a.filter(function (e) { return b.indexOf(e) !== -1; });
};
exports.intersection = intersection;
var onRemote = function (remotePath) {
    return function (fn) {
        var originalDir = process.cwd();
        process.chdir(remotePath);
        var result = fn.apply(null, Array.prototype.slice.call(arguments, 1));
        process.chdir(originalDir);
        return result;
    };
};
exports.onRemote = onRemote;
