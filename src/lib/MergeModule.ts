import {
  writeConflict,
  writeNonConflict,
  _writeStageEntry,
  write as _writeIndex,
  tocToIndex,
} from "./IndexModule";
import {
  hash as hashRef,
  write as writeRef,
  headBranchName,
  toLocalRef,
} from "./RefsModule";
import { isString, intersection } from "./UtilsModule";
import {
  ancestors,
  isAncestor,
  read as readObject,
  commitToc,
} from "./ObjectsModule";
import { tocDiff, FILE_STATUS } from "./DiffModule";
import { write as writeFile, nodegitPath } from "./FilesModule";
import { isBare } from "./ConfigModule";
import * as WorkingCopyModule from "./WorkingCopyModule";
import { FlattenedArray, Tree } from "../interfaces";

export const commonAncestor = (aHash: string, bHash: string) => {
  const sorted = [aHash, bHash].sort();
  aHash = sorted[0];
  bHash = sorted[1];
  const aAncestors = (<FlattenedArray>[aHash]).concat(ancestors(aHash));
  const bAncestors = (<FlattenedArray>[bHash]).concat(ancestors(bHash));
  return <string>intersection(aAncestors, bAncestors)[0];
};

export const isMergeInProgress = () => hashRef("MERGE_HEAD");

export const canFastForward = (
  receiverHash: string | undefined,
  giverHash: string
) => receiverHash === undefined || isAncestor(giverHash, receiverHash);

export const isAForceFetch = (
  receiverHash: string | undefined,
  giverHash: string
) => receiverHash !== undefined && !isAncestor(giverHash, receiverHash);

export const hasConflicts = (receiverHash: any, giverHash: any) => {
  const _mergeDiff = mergeDiff(receiverHash, giverHash);
  return (
    Object.keys(_mergeDiff).filter(
      (p) =>
        !isString(_mergeDiff[p]) &&
        (<Tree>_mergeDiff[p]).status === FILE_STATUS.CONFLICT
    ).length > 0
  );
};

export const mergeDiff = (receiverHash: string, giverHash: string) =>
  tocDiff(
    commitToc(receiverHash),
    commitToc(giverHash),
    commitToc(commonAncestor(receiverHash, giverHash))
  );

export const writeMergeMsg = (
  receiverHash: string,
  giverHash: string,
  ref: string
) => {
  const msg = [`Merge ${ref} into ${headBranchName()}`];
  const _mergeDiff = mergeDiff(receiverHash, giverHash);
  const conflicts = Object.keys(_mergeDiff).filter(
    (p) => (<Tree>_mergeDiff[p]).status === FILE_STATUS.CONFLICT
  );
  if (conflicts.length > 0) msg.push(`\nConflicts:\n${conflicts.join("\n")}`);

  writeFile(nodegitPath("MERGE_MSG"), msg.join());
};
export const writeIndex = (receiverHash: string, giverHash: string) => {
  const _mergeDiff = mergeDiff(receiverHash, giverHash);
  _writeIndex({});
  Object.keys(_mergeDiff).forEach((p) => {
    if (<string>(<Tree>_mergeDiff[p]).status === FILE_STATUS.CONFLICT)
      writeConflict(
        p,
        readObject(<string>(<Tree>_mergeDiff[p]).receiver) || "",
        readObject(<string>(<Tree>_mergeDiff[p]).giver) || "",
        readObject(<string>(<Tree>_mergeDiff[p]).base)
      );
    else if ((<Tree>_mergeDiff[p]).status === FILE_STATUS.MODIFY)
      writeNonConflict(p, readObject(<string>(<Tree>_mergeDiff[p]).giver));
    else if (
      (<Tree>_mergeDiff[p]).status === FILE_STATUS.ADD ||
      (<Tree>_mergeDiff[p]).status === FILE_STATUS.SAME
    ) {
      const content = readObject(
        <string>(<Tree>_mergeDiff[p]).receiver ||
          <string>(<Tree>_mergeDiff[p]).giver
      );
      writeNonConflict(p, content);
    }
  });
};

export const writeFastForwardMerge = (
  receiverHash: string | undefined,
  giverHash: string | undefined
) => {
  writeRef(toLocalRef(headBranchName()), giverHash);

  _writeIndex(tocToIndex(commitToc(giverHash)));

  if (!isBare()) {
    const receiverToc =
      receiverHash === undefined ? {} : commitToc(receiverHash);
    const c = commitToc(giverHash);
    const t = tocDiff(receiverToc, c);

    WorkingCopyModule.write(t);
  }
};

export const writeNonFastForwardMerge = (
  receiverHash: string,
  giverHash: string,
  giverRef: string
) => {
  writeRef("MERGE_HEAD", giverHash);
  writeMergeMsg(receiverHash, giverHash, giverRef);
  writeIndex(receiverHash, giverHash);

  if (!isBare()) WorkingCopyModule.write(mergeDiff(receiverHash, giverHash));
};
