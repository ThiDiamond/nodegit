import { normalize as normalizePath, join as joinPath } from "path";
import { unlinkSync, existsSync, readdirSync } from "fs";
import { lines, setIn } from "./UtilsModule";
import {
  read as readFile,
  nodegitPath,
  write as writeFile,
} from "./FilesModule";
import { exists as objectExists } from "./ObjectsModule";
import { isBare } from "./ConfigModule";
import { isMergeInProgress } from "./MergeModule";

export const isRef = (ref: string) =>
  ref !== undefined &&
  (ref.match("^refs/heads/[A-Za-z-]+$") ||
    ref.match("^refs/remotes/[A-Za-z-]+/[A-Za-z-]+$") ||
    ["HEAD", "FETCH_HEAD", "MERGE_HEAD"].indexOf(ref) !== -1);

export const terminalRef = (ref = "") => {
  if (ref === "HEAD" && !isHeadDetached()) {
    const branch = readFile(nodegitPath("HEAD") || "");
    const isPointingAtBranch = branch.match("ref: (refs/heads/.+)");
    if (isPointingAtBranch && isPointingAtBranch.length >= 1)
      return isPointingAtBranch[1];
  } else if (isRef(ref)) return ref;
  else return toLocalRef(ref);
};

export const hash = (refOrHash: string) => {
  if (objectExists(refOrHash)) return refOrHash;
  else {
    const _terminalRef = terminalRef(refOrHash);
    if (_terminalRef === "FETCH_HEAD")
      return fetchHeadBranchToMerge(headBranchName());
    else if (exists(_terminalRef)) return readFile(nodegitPath(_terminalRef));
  }
};
export const isHeadDetached = () =>
  readFile(nodegitPath("HEAD")).match("refs") === null;

export const isCheckedOut = (branch: string) =>
  !isBare() && headBranchName() === branch;

export const toLocalRef = (name: string) => `refs/heads/${name}`;

export const toRemoteRef = (remote: string, name: string) =>
  `refs/remotes/${remote}/${name}`;
export const write = (ref = "", content = "") => {
  if (isRef(ref)) writeFile(nodegitPath(normalizePath(ref)), content);
};

export const rm = (ref: string) => {
  if (isRef(ref)) unlinkSync(nodegitPath(ref) || "");
};

export const fetchHeadBranchToMerge = (branchName: string) =>
  lines(readFile(nodegitPath("FETCH_HEAD") || ""))
    .filter((l) => l.match(`^.+ branch ${branchName} of`))
    .map((l) => (l.match("^([^ ]+) ") || "")[1])[0];

export const localHeads = () =>
  readdirSync(joinPath(nodegitPath() || "", "refs", "heads")).reduce(
    (o, n) => setIn(o, [n, hash(n) || ""]),
    {}
  );

export const exists = (ref = "") =>
  isRef(ref) && existsSync(nodegitPath(ref) || "");

export const headBranchName = () => {
  if (!isHeadDetached())
    return (readFile(nodegitPath("HEAD")).match("refs/heads/(.+)") || [])[1];

  return "";
};

export const commitParentHashes = () => {
  const headHash = hash("HEAD");

  if (isMergeInProgress()) return [headHash || "", hash("MERGE_HEAD") || ""];
  else if (!headHash) return [];
  else return [headHash];
};
