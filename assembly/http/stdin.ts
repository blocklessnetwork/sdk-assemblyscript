import { memory } from "../index"

export class HttpStdin {
    static method: string = 'GET'
    static path: string = '/'
    static query: Map<string, string> = new Map()

    static initalize(): void {
        const blsStdin = new memory.Stdin().read()
        const blsStdinString = blsStdin.toString().replaceAll('\0', '').trim()
        const blsPathQuerySplit = blsStdinString.split('?')

        const blsEnv = new memory.EnvVars().read()
        const blsEnvString = blsEnv.toJSON()

        if (
            blsEnvString.has('BLS_REQUEST_METHOD') && 
            blsEnvString.has('BLS_REQUEST_PATH') && 
            blsEnvString.has('BLS_REQUEST_QUERY')
        ) {
            HttpStdin.method = blsEnvString.get('BLS_REQUEST_METHOD')!.toString()
            HttpStdin.path = blsEnvString.get('BLS_REQUEST_PATH')!.toString()
            const queryInput = blsEnvString.get('BLS_REQUEST_QUERY')!.toString().split('&')
    
            queryInput.forEach(i => {
                const pair = i.split('=')
                HttpStdin.query.set(pair[0].trim(), pair.length > 1 ? pair[1].trim() : '')
            })
        } else if (blsPathQuerySplit.length === 2) {
            HttpStdin.path = blsPathQuerySplit[0]
            const queryInput = blsPathQuerySplit[1].split('&')
    
            queryInput.forEach(i => {
                const pair = i.split('=')
                HttpStdin.query.set(pair[0].trim(), pair.length > 1 ? pair[1].trim() : '')
            })
        } else if (blsPathQuerySplit.length === 1) {
            const blsArgumentSplit = blsPathQuerySplit[0].split(' ')
            HttpStdin.path = blsArgumentSplit[0]
            blsArgumentSplit.forEach(i => {
                const pair = i.split('=')
                HttpStdin.query.set(pair[0].trim(), pair.length > 1 ? pair[1].trim() : '')
            })
        }
    }
}

