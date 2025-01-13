import { errno, handle, ptr } from "../types";
import { SUCCESS } from "../error";
import { JSONEncoder } from "../json";
import { json } from "..";

// External function declarations for WASM imports
@external("blockless_llm", "llm_set_model_request")
declare function llm_set_model_request(model_ptr: ptr<u8>, model_len: u32, fd: ptr<handle>): errno;

@external("blockless_llm", "llm_get_model_response")
declare function llm_get_model_response(buf: ptr<u8>, size: u32, num: ptr<u32>, fd: handle): errno;

@external("blockless_llm", "llm_set_model_options_request")
declare function llm_set_model_options_request(options_ptr: ptr<u8>, options_len: u32, fd: handle): errno;

@external("blockless_llm", "llm_get_model_options")
declare function llm_get_model_options(buf: ptr<u8>, size: u32, num: ptr<u32>, fd: handle): errno;

@external("blockless_llm", "llm_prompt_request")
declare function llm_prompt_request(prompt_ptr: ptr<u8>, prompt_len: u32, fd: handle): errno;

@external("blockless_llm", "llm_read_prompt_response")
declare function llm_read_prompt_response(buf: ptr<u8>, size: u32, num: ptr<u32>, fd: handle): errno;

@external("blockless_llm", "llm_close")
declare function llm_close(fd: handle): errno;

// LLM Options class
export class LlmOptions {
    systemMessage: string;
    temperature: f32;
    topP: f32;

    constructor(systemMessage: string, temperature: f32, topP: f32) {
        this.systemMessage = systemMessage;
        this.temperature = temperature;
        this.topP = topP;
    }

    toJson(): string {
        let encoder = new JSONEncoder();
        encoder.pushObject("");
        encoder.setString("system_message", this.systemMessage);
        
        if (this.temperature >= 0) {
            encoder.setFloat("temperature", this.temperature);
        }
        
        if (this.topP >= 0) {
            encoder.setFloat("top_p", this.topP);
        }
        
        encoder.popObject();
        return encoder.toString();
    }

    static fromBytes(bytes: Array<u8>): LlmOptions | null {
        let text = String.UTF8.decodeUnsafe(bytes.dataStart, bytes.length);
        let parsed = <json.JSON.Obj>json.JSON.parse(text);
        if (parsed.isNull) return null;

        let options = new LlmOptions("", -1, -1);
        
        let systemMessage = parsed.getString("system_message");
        if (systemMessage) {
            options.systemMessage = systemMessage.valueOf();
        }

        let temperature = parsed.getFloat("temperature");
        if (temperature) {
            options.temperature = <f32>temperature.valueOf();
        }

        let topP = parsed.getFloat("top_p");
        if (topP) {
            options.topP = <f32>topP.valueOf();
        }

        return options;
    }
}

// Main BlocklessLLM class
export class BlocklessLlm {
    private handle: handle;
    private modelName: string;
    private options: LlmOptions;

    constructor(modelName: string, options: LlmOptions) {
        this.handle = 0;
        this.modelName = modelName;
        this.options = options;

        this.setModel(modelName);
        this.setOptions(this.options);
    }

    private setModel(modelName: string): boolean {
        this.modelName = modelName;

        let modelBytes = String.UTF8.encode(modelName);
        let handlePtr = memory.data(8);
        
        let rs = llm_set_model_request(
            changetype<ptr<u8>>(modelBytes),
            modelBytes.byteLength,
            handlePtr
        );

        if (rs != SUCCESS) {
            return false;
        }

        this.handle = load<u32>(handlePtr);
        return true;
    }

    getModel(): string | null {
        let buf = new Array<u8>(256);
        let numPtr = memory.data(8);
        
        let rs = llm_get_model_response(
            buf.dataStart,
            buf.length,
            numPtr,
            this.handle
        );

        if (rs != SUCCESS) {
            return null;
        }

        let num = load<u32>(numPtr);
        return String.UTF8.decodeUnsafe(buf.dataStart, num);
    }

    setOptions(options: LlmOptions): boolean {
        this.options = options;

        let optionsJson = options.toJson();
        let optionsBytes = String.UTF8.encode(optionsJson);
        
        let rs = llm_set_model_options_request(
            changetype<ptr<u8>>(optionsBytes),
            optionsBytes.byteLength,
            this.handle
        );

        if (rs != SUCCESS) {
            return false;
        }

        this.options = options;
        return true;
    }

    getOptions(): LlmOptions | null {
        let buf = new Array<u8>(256);
        let numPtr = memory.data(8);
        
        let rs = llm_get_model_options(
            buf.dataStart,
            buf.length,
            numPtr,
            this.handle
        );

        if (rs != SUCCESS) {
            return null;
        }

        let num = load<u32>(numPtr);
        return LlmOptions.fromBytes(buf.slice(0, num));
    }

    chatRequest(prompt: string): string | null {
        let promptBytes = String.UTF8.encode(prompt);
        
        let rs = llm_prompt_request(
            changetype<ptr<u8>>(promptBytes),
            promptBytes.byteLength,
            this.handle
        );

        if (rs != SUCCESS) {
            return null;
        }

        return this.getChatResponse();
    }

    private getChatResponse(): string | null {
        let result = new Array<u8>();
        
        while (true) {
            let buf = new Array<u8>(4096);
            let numPtr = memory.data(8);
            
            let rs = llm_read_prompt_response(
                buf.dataStart,
                buf.length,
                numPtr,
                this.handle
            );

            if (rs != SUCCESS) {
                return null;
            }

            let num = load<u32>(numPtr);
            if (num == 0) {
                break;
            }

            result = result.concat(buf.slice(0, num));
        }

        return String.UTF8.decodeUnsafe(result.dataStart, result.length);
    }

    close(): void {
        llm_close(this.handle);
    }
}
