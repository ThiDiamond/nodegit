"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.write = exports._write = void 0;
var FilesModule_1 = require("./FilesModule");
var ObjectsModule_1 = require("./ObjectsModule");
var fs_1 = require("fs");
var DiffModule_1 = require("./DiffModule");
var _write = function (dif) {
    var composeConflict = function (receiverFileHash, giverFileHash) {
        return "<<<<<<\n" + ObjectsModule_1.read(receiverFileHash) + "\n======\n" + ObjectsModule_1.read(giverFileHash) + "\n>>>>>>\n";
    };
    Object.keys(dif).forEach(function (p) {
        var status = dif[p].status;
        if (dif[p].status === DiffModule_1.FILE_STATUS.ADD &&
            (dif[p].receiver || dif[p].giver))
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), ObjectsModule_1.read(dif[p].receiver) ||
                dif[p].giver);
        else if (status === DiffModule_1.FILE_STATUS.CONFLICT)
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), composeConflict(dif[p].receiver, dif[p].giver));
        else if (status === DiffModule_1.FILE_STATUS.MODIFY)
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), ObjectsModule_1.read(dif[p].giver));
        else if (status === DiffModule_1.FILE_STATUS.DELETE)
            fs_1.unlinkSync(FilesModule_1.workingCopyPath(p));
    });
    fs_1.readdirSync(FilesModule_1.workingCopyPath())
        .filter(function (n) { return n !== ".nodegit"; })
        .forEach(FilesModule_1.rmEmptyDirs);
};
exports._write = _write;
//@ts-ignore
var write = function (dif) {
    var composeConflict = function (receiverFileHash, giverFileHash) {
        return "<<<<<<\n" +
            ObjectsModule_1.read(receiverFileHash) +
            "\n======\n" +
            ObjectsModule_1.read(giverFileHash) +
            "\n>>>>>>\n";
    };
    Object.keys(dif).forEach(function (p) {
        if (dif[p].status === DiffModule_1.FILE_STATUS.ADD) {
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), ObjectsModule_1.read(dif[p].receiver || dif[p].giver));
        }
        else if (dif[p].status === DiffModule_1.FILE_STATUS.CONFLICT) {
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), composeConflict(dif[p].receiver, dif[p].giver));
        }
        else if (dif[p].status === DiffModule_1.FILE_STATUS.MODIFY) {
            FilesModule_1.write(FilesModule_1.workingCopyPath(p), ObjectsModule_1.read(dif[p].giver));
        }
        else if (dif[p].status === DiffModule_1.FILE_STATUS.DELETE) {
            fs_1.unlinkSync(FilesModule_1.workingCopyPath(p));
        }
    });
    fs_1.readdirSync(FilesModule_1.workingCopyPath())
        .filter(function (n) { return n !== ".nodegit"; })
        .forEach(FilesModule_1.rmEmptyDirs);
};
exports.write = write;
