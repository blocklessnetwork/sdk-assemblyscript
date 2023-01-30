import { memory } from "../index"

export class HttpStdin {
    static path: string = '/'
    static query: Map<string, string> = new Map()

    static initalize(): void {
        const blsStdin = new memory.Stdin().read()
        const blsStdinString = blsStdin.toString().replaceAll('\0', '').trim()
        const blsPathQuerySplit = blsStdinString.split('?')

        if (blsPathQuerySplit.length === 2) {
            HttpStdin.path = blsPathQuerySplit[0]
            const queryInput = blsPathQuerySplit[1].split('&')
    
            queryInput.forEach(i => {
                const pair = i.split('=')
                HttpStdin.query.set(pair[0].trim(), pair.length > 1 ? pair[1].trim() : '')
            })
        } else if (blsPathQuerySplit.length === 1) {
            HttpStdin.path = blsPathQuerySplit[0]
        }
    }
}

