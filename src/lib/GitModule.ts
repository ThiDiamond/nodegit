import { existsSync, statSync, unlinkSync, readdirSync, mkdirSync } from "fs";
import { resolve, relative } from "path";
import {
  inRepo,
  writeFilesFromTree,
  pathFromRepoRoot,
  assertInRepo,
  lsRecursive,
  workingCopyPath,
  read as readFile,
  nodegitPath,
  nestFlatTree,
} from "./FilesModule";
import {
  assertNotBare,
  objToStr,
  read as readConfig,
  write as writeConfig,
} from "./ConfigModule";
import {
  write as writeIndex,
  hasFile,
  isFileInConflict,
  writeNonConflict,
  matchingFiles,
  toc,
  tocToIndex,
  conflictedPaths as _conflictedPaths,
  writeRm,
} from "./IndexModule";
import { intersection, setIn, onRemote } from "./UtilsModule";
import {
  addedOrModifiedFiles,
  diff as Diff,
  nameStatus,
  changedFilesCommitWouldOverwrite,
} from "./DiffModule";
import {
  read as readObject,
  writeTree,
  writeCommit,
  write as writeObject,
  treeHash,
  exists,
  type,
  commitToc,
  isUpToDate,
  allObjects,
} from "./ObjectsModule";
import {
  hash as hashRef,
  isHeadDetached,
  isRef,
  toRemoteRef,
  terminalRef,
  toLocalRef,
  localHeads,
  isCheckedOut,
  headBranchName,
  commitParentHashes,
  rm as rmRef,
  write as writeRef,
} from "./RefsModule";
import * as workingCopy from "./WorkingCopyModule";
import {
  isAForceFetch,
  hasConflicts,
  isMergeInProgress,
  canFastForward,
  writeFastForwardMerge,
  writeNonFastForwardMerge,
} from "./MergeModule";
import { Tree } from "../interfaces";
import * as StatusModule from "./StatusModule";
export const init = (opts: { bare?: string }) => {
  if (inRepo()) return;
  const str = "";

  const nodegitStructure = {
    HEAD: "ref: refs/heads/main\n",

    config: objToStr({
      core: { "": { bare: (!!opts.bare).toString() } },
    }),

    objects: {},
    refs: {
      heads: {},
    },
  };

  writeFilesFromTree(
    opts.bare ? nodegitStructure : { ".nodegit": nodegitStructure },
    process.cwd()
  );
};

export const add = (path: string) => {
  assertInRepo();
  assertNotBare();

  const addedFiles = lsRecursive(path);

  if (addedFiles.length === 0)
    throw new Error(`${pathFromRepoRoot(path)} did not match any files`);
  else addedFiles.forEach((p: string) => update_index(p, { add: true }));
};

export const rm = (path: string, opts: { f?: string; r?: string }) => {
  assertInRepo();
  assertNotBare();

  const filesToRm = matchingFiles(path);

  if (opts.f) throw new Error("unsupported");
  else if (filesToRm.length === 0)
    throw new Error(`${pathFromRepoRoot(path)} did not match any files`);
  else if (existsSync(path) && statSync(path).isDirectory() && !opts.r)
    throw new Error(`not removing ${path} recursively without -r`);
  else {
    const changesToRm = intersection(addedOrModifiedFiles(), filesToRm);
    if (changesToRm.length > 0)
      throw new Error(`these files have changes:\n${changesToRm.join("\n")}\n`);
    else {
      filesToRm.map(workingCopyPath).filter(existsSync).forEach(unlinkSync);
      filesToRm.forEach((p) => update_index(p, { remove: true }));
    }
  }
};

export const commit = (opts: { m?: string }) => {
  assertInRepo();
  assertNotBare();

  const _treeHash = write_tree();

  const headDesc = isHeadDetached() ? "detached HEAD" : headBranchName();

  if (!!hashRef("HEAD") && _treeHash === treeHash(readObject(hashRef("HEAD"))))
    throw new Error(
      `# On ${headDesc}\nnothing to commit, working directory clean`
    );
  else {
    const conflictedPaths = _conflictedPaths();
    if (isMergeInProgress() && conflictedPaths.length > 0)
      throw new Error(
        conflictedPaths.map((p) => `U ${p}`).join("\n") +
          "\ncannot commit because you have unmerged files\n"
      );
    else {
      const m = isMergeInProgress()
        ? readFile(nodegitPath("MERGE_MSG"))
        : opts?.m;

      const commitHash = writeCommit(
        _treeHash,
        <string>m,
        commitParentHashes()
      );
      update_ref("HEAD", commitHash);

      if (isMergeInProgress()) {
        unlinkSync(nodegitPath("MERGE_MSG") || "");
        rmRef("MERGE_HEAD");
        return "Merge made by the three-way strategy";
      } else return `[${headDesc} ${commitHash}] ${m}`;
    }
  }
};

export const branch = (name: string, opts: Tree) => {
  assertInRepo();
  opts = opts || {};

  if (name === undefined)
    return (
      Object.keys(localHeads())
        .map((branch) => (branch === headBranchName() ? "* " : "  ") + branch)
        .join("\n") + "\n"
    );
  else if (!hashRef("HEAD"))
    throw new Error(`${headBranchName()} not a valid object name`);
  else if (exists(toLocalRef(name)))
    throw new Error(`A branch named ${name} already exists`);
  else update_ref(toLocalRef(name), hashRef("HEAD"));
};

export const checkout = (ref: string) => {
  assertInRepo();
  assertNotBare();

  const toHash = hashRef(ref) || "";

  if (!exists(toHash))
    throw new Error(`${ref} did not match any file(s) known to Nodegit`);
  else if (type(readObject(toHash)) !== "commit")
    throw new Error(`reference is not a tree: ${ref}`);
  else if (ref === headBranchName() || ref === readFile(nodegitPath("HEAD")))
    return `Already on ${ref}`;
  else {
    const paths = changedFilesCommitWouldOverwrite(toHash);
    if (paths.length > 0)
      throw new Error(`local changes would be lost\n${paths.join("\n")}\n`);
    else {
      process.chdir(workingCopyPath());
      const isDetachingHead = exists(ref);
      workingCopy.write(Diff(hashRef("HEAD"), toHash));
      writeRef("HEAD", isDetachingHead ? toHash : `ref: ${toLocalRef(ref)}`);
      writeIndex(tocToIndex(commitToc(toHash)));
      return isDetachingHead
        ? `Note: checking out ${toHash}\nYou are in detached HEAD state.`
        : `Switched to branch ${ref}`;
    }
  }
};

export const diff = (ref1: string, ref2: string) => {
  assertInRepo();
  assertNotBare();

  if (ref1 && !hashRef(ref1))
    throw new Error(`ambiguous argument ${ref1}: unknown revision`);
  else if (ref2 && !hashRef(ref2))
    throw new Error(`ambiguous argument ${ref2}: unknown revision`);
  else {
    const nameToStatus: Tree = nameStatus(Diff(hashRef(ref1), hashRef(ref2)));

    return (
      Object.keys(nameToStatus)
        .map((path) => `${nameToStatus[path]} ${path}`)
        .join("\n") + "\n"
    );
  }
};

export const remote = (command: string, name: string, path: string) => {
  assertInRepo();

  if (command !== "add") throw new Error("unsupported");
  else if (name in <Tree>readConfig()["remote"])
    throw new Error(`remote ${name} already exists`);
  else {
    writeConfig(setIn(readConfig(), ["remote", name, "url", path]));
    return "\n";
  }
};

export const fetch = (remote: string, branch: string) => {
  assertInRepo();

  if (!remote || !branch) throw new Error("unsupported");
  else if (!(remote in <Tree>readConfig().remote))
    throw new Error(`${remote} does not appear to be a git repository`);
  else {
    const remoteUrl = <string>(<Tree>(<Tree>readConfig().remote)[remote]).url;
    const remoteRef = toRemoteRef(remote, branch);

    const newHash = onRemote(remoteUrl)(() => hashRef(branch));

    if (newHash === undefined) {
      throw new Error(`couldn't find remote ref ${branch}`);
    } else {
      const oldHash = hashRef(remoteRef);

      const remoteObjects = onRemote(remoteUrl)(allObjects);
      remoteObjects.forEach(writeObject);

      update_ref(remoteRef, newHash);

      writeRef("FETCH_HEAD", `${newHash} branch ${branch} of ${remoteUrl}`);

      return (
        [
          `From ${remoteUrl}`,
          `Count ${remoteObjects.length}`,
          `${branch} -> ${remote}/${branch}` +
            (isAForceFetch(oldHash, newHash) ? " (forced)" : ""),
        ].join("\n") + "\n"
      );
    }
  }
};
export const merge = (ref: string) => {
  assertInRepo();
  assertNotBare();

  const receiverHash = hashRef("HEAD") || "";

  const giverHash = hashRef(ref);

  if (isHeadDetached()) throw new Error("unsupported");
  else if (!giverHash || type(readObject(giverHash)) !== "commit")
    throw new Error(`${ref}: expected commit type`);
  else if (isUpToDate(receiverHash, giverHash)) return "Already up-to-date";
  else {
    const paths = changedFilesCommitWouldOverwrite(giverHash);
    if (paths.length > 0)
      throw new Error(`local changes would be lost\n${paths.join("\n")}\n`);
    else if (canFastForward(receiverHash, giverHash)) {
      writeFastForwardMerge(receiverHash, giverHash);
      return "Fast-forward";
    } else {
      writeNonFastForwardMerge(receiverHash, giverHash, ref);

      if (hasConflicts(receiverHash, giverHash))
        return "Automatic merge failed. Fix conflicts and commit the result.";
      //If there are no conflicted files, a commit is created from the merged changes and the merge is over.
      else return commit({});
    }
  }
};

export const pull = (remote: string, branch: string) => {
  assertInRepo();
  assertNotBare();
  fetch(remote, branch);
  return merge("FETCH_HEAD");
};

export const push = (remote: string, branch: string, opts: { f?: string }) => {
  assertInRepo();

  if (!remote || !branch) throw new Error("unsupported");
  else if (!(remote in <Tree>(<Tree>readConfig()).remote))
    throw new Error(`${remote} does not appear to be a git repository`);
  else {
    const remotePath = <string>(<Tree>(<Tree>readConfig().remote)[remote]).url;

    const remoteCall = onRemote(remotePath);

    if (remoteCall(() => isCheckedOut(branch)))
      throw new Error(`refusing to update checked out branch ${branch}`);
    else {
      const receiverHash = remoteCall(hashRef);

      const giverHash = hashRef(branch) || "";

      if (isUpToDate(receiverHash, giverHash)) return "Already up-to-date";
      else if (!opts.f && !canFastForward(receiverHash, giverHash))
        throw new Error(`failed to push some refs to ${remotePath}`);
      else {
        allObjects().forEach((o) => {
          remoteCall(() => writeObject(<string>o));
        });

        remoteCall(update_ref);

        update_ref(toRemoteRef(remote, branch), giverHash);

        return (
          [
            `To ${remotePath}`,
            `Count ${allObjects().length}`,
            `branch -> ${branch}`,
          ].join("\n") + "\n"
        );
      }
    }
  }
};

export const status = () => {
  assertInRepo();
  assertNotBare();
  return StatusModule.toString();
};

export const clone = (remotePath: string, targetPath: string, opts: Object) => {
  if (!remotePath || !targetPath)
    throw new Error("you must specify remote path and target path");
  else if (!existsSync(remotePath) || !onRemote(remotePath)(inRepo))
    throw new Error(`repository ${remotePath} does not exist`);
  else if (existsSync(targetPath) && readdirSync(targetPath).length > 0)
    throw new Error(`${targetPath} already exists and is not empty`);
  else {
    remotePath = resolve(process.cwd(), remotePath);

    if (!existsSync(targetPath)) mkdirSync(targetPath);

    onRemote(targetPath)(() => {
      init(opts);

      remote("add", "origin", relative(process.cwd(), remotePath));

      const remoteHeadHash = onRemote(remotePath)(() => hashRef("main"));

      if (remoteHeadHash !== undefined) {
        fetch("origin", "main");
        writeFastForwardMerge(undefined, remoteHeadHash);
      }
    });

    return `Cloning into ${targetPath}`;
  }
};
export const update_index = (
  path = "",
  opts: { remove?: boolean; add?: boolean }
) => {
  assertInRepo();
  assertNotBare();

  const pathFromRoot = pathFromRepoRoot(path);
  const isOnDisk = existsSync(path);
  const isInIndex = hasFile(path, 0);

  if (isOnDisk && statSync(path).isDirectory())
    throw new Error(`${pathFromRoot} is a directory - add files inside\n`);
  else if (!!opts.remove && !isOnDisk && isInIndex)
    if (isFileInConflict(path)) throw new Error("unsupported");
    else {
      writeRm(path);
      return "\n";
    }
  else if (!!opts.remove && !isOnDisk && !isInIndex) return "\n";
  else if (!opts.add && isOnDisk && !isInIndex)
    throw new Error(`cannot add ${pathFromRoot} to index - use --add option\n`);
  else if (isOnDisk && (opts.add || isInIndex)) {
    writeNonConflict(path, readFile(workingCopyPath(path)));
    return "\n";
  } else if (!opts.remove && !isOnDisk)
    throw new Error(`${pathFromRoot} does not exist and --remove not passed\n`);
};

export const write_tree = () => {
  assertInRepo();
  return writeTree(nestFlatTree(toc()));
};

export const update_ref = (refToUpdate = "", refToUpdateTo = "") => {
  assertInRepo();

  const hash = hashRef(refToUpdateTo);

  if (!exists(hash)) throw new Error(`${refToUpdateTo} is not a valid SHA1`);
  else if (!isRef(refToUpdate))
    throw new Error(`cannot lock the ref ${refToUpdate}`);
  else if (type(readObject(hash)) !== "commit") {
    const branch = terminalRef(refToUpdate);
    throw new Error(`${branch} cannot refer to non-commit object ${hash}\n`);
  } else writeRef(terminalRef(refToUpdate), hash);
};
