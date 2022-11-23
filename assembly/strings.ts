
export function buffer2string(v: Array<u8>, l: u32): string {
    return String.UTF8.decodeUnsafe(v.dataStart, l);
}

export function string2buffer(v: Array<u8>): ArrayBuffer {
    return String.UTF8.encode(v);
}