import { toc, conflictedPaths } from "./IndexModule";
import { readdirSync } from "fs";
import { workingCopyPath } from "./FilesModule";
import { hash, headBranchName } from "./RefsModule";
import { commitToc } from "./ObjectsModule";
import { nameStatus, tocDiff, diff } from "./DiffModule";
import { Tree } from "../interfaces";
import { flatten } from "./UtilsModule";

export const toString = () => {
  const untracked = () =>
    readdirSync(workingCopyPath()).filter((p) => !toc()[p] && p !== ".nodegit");

  const toBeCommitted = () => {
    const headHash = hash("HEAD");
    const headToc = headHash === undefined ? {} : commitToc(headHash);

    const ns = nameStatus(tocDiff(headToc, toc()));

    return Object.keys(ns).map((p) => `${(<Tree>ns)[p]} ${p}`);
  };

  const notStagedForCommit = () => {
    const ns = nameStatus(diff(undefined, undefined));
    return Object.keys(ns).map((p) => `${(<Tree>ns)[p]} ${p}`);
  };

  const listing = (heading: string, lines: string[]) =>
    lines.length > 0 ? [heading, lines] : [];

  return flatten([
    `On branch ${headBranchName()}`,
    listing("Untracked files:", untracked()).join(),
    listing("Unmerged paths:", conflictedPaths()).join(),
    listing("Changes to be committed:", toBeCommitted()).join(),
    listing("Changes not staged for commit:", notStagedForCommit()).join(),
  ]).join("\n");
};
