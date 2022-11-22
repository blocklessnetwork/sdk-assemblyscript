
export function buffer2string(v: Array<u8>, l: u32): string {
    return String.UTF8.decodeUnsafe(v.dataStart, l);
}