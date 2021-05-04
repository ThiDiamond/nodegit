"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objToStr = exports.strToObj = exports.write = exports.read = exports.assertNotBare = exports.isBare = void 0;
var FilesModule_1 = require("./FilesModule");
var UtilsModule_1 = require("./UtilsModule");
var isBare = function () { return exports.read()["core"]["bare"] === "true"; };
exports.isBare = isBare;
var assertNotBare = function () {
    if (exports.isBare())
        throw new Error("this operation must be run in a work tree");
};
exports.assertNotBare = assertNotBare;
var read = function () { return exports.strToObj(FilesModule_1.read(FilesModule_1.nodegitPath("config"))); };
exports.read = read;
var write = function (configObj) {
    return FilesModule_1.write(FilesModule_1.nodegitPath("config"), exports.objToStr(configObj));
};
exports.write = write;
var strToObj = function (str) {
    return str
        .split("[")
        .map(function (item) { return item.trim(); })
        .filter(function (item) { return item !== ""; })
        .reduce(function (c, item) {
        var lines = item.split("\n");
        var entry = [];
        //section eg “core”
        var firstLine = lines[0];
        var matcherArray = firstLine.match(/([^ \]]+)( |\])/);
        if (matcherArray) {
            var matcher = matcherArray[1];
            entry.push(matcher);
        }
        var subsectionMatch = lines[0].match(/\"(.+)\"/);
        var subsection = subsectionMatch === null ? "" : subsectionMatch[1];
        entry.push(subsection);
        var options = lines.slice(1).reduce(function (s, l) {
            s[l.split("=")[0].trim()] = l.split("=")[1].trim();
            return s;
        }, {});
        entry.push(options);
        return UtilsModule_1.setIn(c, entry);
    }, { remote: {} });
};
exports.strToObj = strToObj;
var objToStr = function (configObj) {
    return Object.keys(configObj)
        .reduce(function (arr, section) {
        return arr.concat(Object.keys(configObj[section]).map(function (subsection) { return ({
            section: section,
            subsection: subsection,
        }); }));
    }, [])
        .map(function (entry) {
        var subsection = entry.subsection === "" ? "" : "  \"" + entry.subsection + "\"";
        var settings = configObj[entry.section][entry.subsection];
        return "[" + entry.section + subsection + "]\n" + Object.keys(settings)
            .map(function (k) { return "  " + k + " = " + settings[k]; })
            .join("\n") + "\n";
    })
        .join("");
};
exports.objToStr = objToStr;
