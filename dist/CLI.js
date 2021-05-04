"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCli = void 0;
var Nodegit = require("./lib/GitModule");
var parseOptions = function (argv) {
    var name;
    return argv.reduce(function (opts, arg) {
        if (arg.match(/^-/)) {
            name = arg.replace(/^-+/, "");
            opts[name] = true;
        }
        else if (!!name) {
            opts[name] = arg;
            name = undefined;
        }
        else {
            opts._.push(arg);
        }
        return opts;
    }, { _: [] });
};
exports.runCli = (module.exports.runCli = function (argv) {
    var opts = parseOptions(argv);
    var commandName = opts._[2];
    if (!commandName)
        throw new Error("you must specify a Nodegit command to run");
    else {
        var commandFnName = commandName.replace(/-/g, "_");
        var fn = __assign({}, Nodegit)[commandFnName];
        if (!fn)
            throw new Error("\"" + commandFnName + "\" is not a Nodegit command");
        else {
            var commandArgs = opts._.slice(3);
            while (commandArgs.length < fn.length - 1) {
                commandArgs.push(undefined);
            }
            //@ts-ignore
            return fn.apply(__assign({}, Nodegit), commandArgs.concat(opts));
        }
    }
});
try {
    var result = exports.runCli(process.argv);
    if (!!result)
        console.log(result);
}
catch (e) {
    console.error(e.toString());
}
