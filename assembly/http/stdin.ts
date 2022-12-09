import { memory } from "@blockless/sdk"

export enum StdinCommand {
    BLS_REQUEST_PATH = 1,
    NONE = 999
}

export class HttpStdin {
    static path: StdinCommand = StdinCommand.NONE
    static params: Map<string, string>

    static initalize(): void {
        const blsStdin = new memory.Stdin().read()
        const blsStdinString = blsStdin.toString()
        const allInput = blsStdinString.split(' ')
    }
}