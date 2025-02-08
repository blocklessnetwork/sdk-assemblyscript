import { errno, handle, ptr } from "../types";
import { SUCCESS } from "../error";
import { JSONEncoder } from "../json";
import { json } from "..";

@external("blockless_llm", "llm_set_model_request")
declare function llm_set_model_request(handle: ptr<handle>, model_ptr: ptr<u8>, model_len: u8): errno;

@external("blockless_llm", "llm_get_model_response")
declare function llm_get_model_response(handle: handle, buf: ptr<u8>, buf_len: u8, bytes_written: ptr<u8>): errno;

@external("blockless_llm", "llm_set_model_options_request")
declare function llm_set_model_options_request(handle: handle, options_ptr: ptr<u8>, options_len: u16): errno;

@external("blockless_llm", "llm_get_model_options")
declare function llm_get_model_options(handle: handle, buf: ptr<u8>, buf_len: u16, bytes_written: ptr<u16>): errno;

@external("blockless_llm", "llm_prompt_request")
declare function llm_prompt_request(handle: handle, prompt_ptr: ptr<u8>, prompt_len: u16): errno;

@external("blockless_llm", "llm_read_prompt_response")
declare function llm_read_prompt_response(handle: handle, buf: ptr<u8>, buf_len: u16, bytes_written: ptr<u16>): errno;

@external("blockless_llm", "llm_close")
declare function llm_close(handle: handle): errno;

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

export class BlocklessLlm {
    private handle: handle;
    private modelName: string;
    private options: LlmOptions;

    constructor(modelName: string, options: LlmOptions) {
        this.handle = 0; // reset by host runtime
        this.modelName = modelName;
        this.options = options;

        this.setModel(modelName);
        this.setOptions(this.options);
    }

    private setModel(modelName: string): boolean {
        this.modelName = modelName;

        let modelBytes = String.UTF8.encode(modelName);
        let handlePtr = memory.data(8);
        
        let code = llm_set_model_request(
            handlePtr,
            changetype<ptr<u8>>(modelBytes),
            modelBytes.byteLength as u8,
        );
        if (code != SUCCESS) return false;

        this.handle = load<u8>(handlePtr);
        return true;
    }

    getModel(): string | null {
        let buf = new Array<u8>(u8.MAX_VALUE);
        let bytesWritten = memory.data(8);
        
        let rs = llm_get_model_response(
            this.handle,
            buf.dataStart,
            buf.length as u8,
            bytesWritten,
        );

        if (rs != SUCCESS) {
            return null;
        }

        let num = load<u8>(bytesWritten);
        return String.UTF8.decodeUnsafe(buf.dataStart, num);
    }

    setOptions(options: LlmOptions): boolean {
        this.options = options;

        let optionsJson = options.toJson();
        let optionsBytes = String.UTF8.encode(optionsJson);
        
        let rs = llm_set_model_options_request(
            this.handle,
            changetype<ptr<u8>>(optionsBytes),
            optionsBytes.byteLength as u16,
        );

        if (rs != SUCCESS) {
            return false;
        }

        this.options = options;
        return true;
    }

    getOptions(): LlmOptions | null {
        let buf = new Array<u8>(u16.MAX_VALUE);
        let bytesWritten = memory.data(8);
        
        let code = llm_get_model_options(
            this.handle,
            buf.dataStart,
            buf.length as u16,
            bytesWritten,
        );
        if (code != SUCCESS) return null;

        let num = load<u16>(bytesWritten);
        return LlmOptions.fromBytes(buf.slice(0, num));
    }

    chatRequest(prompt: string): string | null {
        let promptBytes = String.UTF8.encode(prompt);
        
        let code = llm_prompt_request(
            this.handle,
            changetype<ptr<u8>>(promptBytes),
            promptBytes.byteLength as u16,
        );
        if (code != SUCCESS) return null;

        return this.getChatResponse();
    }

    private getChatResponse(): string | null {
        let buf = new Array<u8>(u16.MAX_VALUE);
        let bytesWritten = memory.data(8);
        
        let code = llm_read_prompt_response(
            this.handle,
            buf.dataStart,
            buf.length as u16,
            bytesWritten,
        );
        if (code != SUCCESS) return null;

        let num = load<u16>(bytesWritten);
        return String.UTF8.decodeUnsafe(buf.dataStart, num);
    }

    close(): void {
        llm_close(this.handle);
    }
}
