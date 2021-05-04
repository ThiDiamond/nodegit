import { Tree } from "../interfaces";
import { toc, workingCopyToc } from "./IndexModule";
import { commitToc } from "./ObjectsModule";
import { hash as hashRef } from "./RefsModule";
import { setIn, intersection, unique } from "./UtilsModule";

export const FILE_STATUS = {
  ADD: "A",
  MODIFY: "M",
  DELETE: "D",
  SAME: "SAME",
  CONFLICT: "CONFLICT",
};

export const diff = (hash1: string | undefined, hash2: string | undefined) => {
  const a = hash1 === undefined ? toc() : commitToc(hash1);
  const b = hash2 === undefined ? workingCopyToc() : commitToc(hash2);
  return tocDiff(a, b);
};

export const nameStatus = (dif: Tree) =>
  Object.keys(dif)
    .filter((p) => (<Tree>dif[p]).status !== FILE_STATUS.SAME)
    .reduce((ns, p) => setIn(ns, [p, <string>(<Tree>dif[p]).status]), {});

export const tocDiff = (receiver: Tree, giver: Tree, base?: Tree) => {
  const fileStatus = (receiver = "", giver = "", base = "") => {
    const receiverPresent = !!receiver;
    const basePresent = !!base;
    const giverPresent = !!giver;
    if (receiverPresent && giverPresent && receiver !== giver) {
      if (receiver !== base && giver !== base) return FILE_STATUS.CONFLICT;
      else return FILE_STATUS.MODIFY;
    } else if (receiver === giver) return FILE_STATUS.SAME;
    else if (
      (!receiverPresent && !basePresent && giverPresent) ||
      (receiverPresent && !basePresent && !giverPresent)
    )
      return FILE_STATUS.ADD;
    else if (
      (receiverPresent && basePresent && !giverPresent) ||
      (!receiverPresent && basePresent && giverPresent)
    )
      return FILE_STATUS.DELETE;
  };

  base = base || receiver;

  const paths = Object.keys(receiver)
    .concat(Object.keys(base))
    .concat(Object.keys(giver));

  const u = unique(paths)
    //@ts-ignore
    .reduce<Tree>((idx, p) => {
      const dif: Tree = {
        status:
          fileStatus(
            <string>receiver[p],
            <string>giver[p],
            <string>(<Tree>base)[p]
          ) || "",
        receiver: receiver[p],
        base: (<Tree>base)[p],
        giver: giver[p],
      };
      return setIn(idx, [p, dif]);
    }, {});
  return u;
};

export const changedFilesCommitWouldOverwrite = (hash?: string) => {
  const headHash = hashRef("HEAD");
  return intersection(
    Object.keys(nameStatus(diff(headHash, undefined))),
    Object.keys(nameStatus(diff(headHash, hash)))
  );
};

export const addedOrModifiedFiles = () => {
  const headToc = hashRef("HEAD") ? commitToc(hashRef("HEAD")) : {};
  const wc = nameStatus(tocDiff(headToc, workingCopyToc()));
  return Object.keys(wc).filter((p) => (<Tree>wc)[p] !== FILE_STATUS.DELETE);
};
