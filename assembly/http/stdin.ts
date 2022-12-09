import { memory } from "../index"

export class HttpStdin {
    static path: '/'
    static query: Map<string, string> = new Map()

    static initalize(): void {
        const blsStdin = new memory.Stdin().read()
        const blsStdinString = blsStdin.toString().replaceAll('\0', '').trim()

        if (blsStdinString.length > 0) {
            const allInput = blsStdinString.split('&')
    
            allInput.forEach(i => {
                const pair = i.split('=')
                HttpStdin.query.set(pair[0].trim(), pair.length > 1 ? pair[1].trim() : '')
            })
        }
    }
}

