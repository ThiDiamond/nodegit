import {
  write as writeFile,
  workingCopyPath,
  rmEmptyDirs,
} from "./FilesModule";
import { read as readObject } from "./ObjectsModule";
import { readdirSync, unlinkSync } from "fs";
import { FILE_STATUS } from "./DiffModule";
import { Tree } from "../interfaces";

//@ts-ignore
export const write = (dif) => {
  const composeConflict = (receiverFileHash: string, giverFileHash: string) =>
    `<<<<<<\n${readObject(receiverFileHash)}\n======\n${readObject(
      giverFileHash
    )}\n>>>>>>\n`;

  Object.keys(dif).forEach((p) => {
    if (dif[p].status === FILE_STATUS.ADD) {
      writeFile(
        workingCopyPath(p),
        readObject(dif[p].receiver || dif[p].giver)
      );
    } else if (dif[p].status === FILE_STATUS.CONFLICT) {
      writeFile(
        workingCopyPath(p),
        composeConflict(dif[p].receiver, dif[p].giver)
      );
    } else if (dif[p].status === FILE_STATUS.MODIFY) {
      writeFile(workingCopyPath(p), readObject(dif[p].giver));
    } else if (dif[p].status === FILE_STATUS.DELETE) {
      unlinkSync(workingCopyPath(p));
    }
  });

  readdirSync(workingCopyPath())
    .filter((n) => n !== ".nodegit")
    .forEach(rmEmptyDirs);
};
