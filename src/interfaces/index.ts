export interface Commit {
    id: number;
    parent: Commit | null;
    message: string;
}

export interface Branch {
    name: string;
    commit: Commit | null;
}

export interface IndexEntry {
    fields: Buffer;
    path: string;
}
type ToString = () => {};

export interface Object {
    [key: string]: string;
}

export interface Tree {
    [key: string]: Tree | string;
}

export type TestArray = Array<Tree | string>;

export type FlattenedArray = Array<FlattenedArray | string>;
