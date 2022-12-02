
export function buffer2string(v: Array<u8>, l: u32): string {
    return String.UTF8.decodeUnsafe(v.dataStart, l);
}

export function string2buffer(v: Array<u8>): ArrayBuffer {
    return String.UTF8.encode(v);
}

export function arrayIndex(v: Array<u8>, sv: Array<u8>): i32 {
    if (sv.length == 0) {
        return -1;
    }
    for (let i = 0; i < v.length; i++) {
        if (v[i] == sv[0]) {
            let rs = i;
            for (let j = 1; j < sv.length && i+j < v.length; j++) {
                if (sv[j] != v[i+j]) {
                    rs = -1;
                    continue;
                }
            }
            if (rs >= 0) {
                return rs;
            }
        }
    }
    return -1;
}