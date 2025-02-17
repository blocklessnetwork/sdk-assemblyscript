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

export class ModelQuantization {
    DEFAULT: string;
    private quantizations: Map<string, string>;

    constructor(baseModelName: string, quantizations: Map<string, string>) {
        this.DEFAULT = baseModelName;
        this.quantizations = quantizations;
    }

    get(key: string): string | null {
        if (key === "DEFAULT") return this.DEFAULT;
        return this.quantizations.has(key) ? this.quantizations.get(key) : null;
    }

    keys(): string[] {
        const keys = ["DEFAULT"];
        const quantKeys = this.quantizations.keys();
        for (let i = 0; i < quantKeys.length; i++) {
            keys.push(quantKeys[i]);
        }
        return keys;
    }

    // Helper method to convert to JSON string
    toString(): string {
        const obj: Map<string, string> = new Map();
        obj.set("DEFAULT", this.DEFAULT);
        
        const quantKeys = this.quantizations.keys();
        for (let i = 0; i < quantKeys.length; i++) {
            const key = quantKeys[i];
            obj.set(key, this.quantizations.get(key));
        }
        
        return JSON.stringify(obj);
    }
}

export class SupportedModels {
    LLAMA_3_2_1B: ModelQuantization;
    LLAMA_3_2_3B: ModelQuantization;
    MISTRAL_7B: ModelQuantization;
    MIXTRAL_8X7B: ModelQuantization;
    GEMMA_2_2B: ModelQuantization;
    GEMMA_2_7B: ModelQuantization;
    GEMMA_2_9B: ModelQuantization;

    constructor() {
        // Initialize LLAMA_3_2_1B
        const llama321bQuant = new Map<string, string>();
        llama321bQuant.set("Q6_K", "Llama-3.2-1B-Instruct-Q6_K");
        llama321bQuant.set("Q4F16_1", "Llama-3.2-1B-Instruct-q4f16_1");
        this.LLAMA_3_2_1B = new ModelQuantization("Llama-3.2-1B-Instruct", llama321bQuant);

        // Initialize LLAMA_3_2_3B
        const llama323bQuant = new Map<string, string>();
        llama323bQuant.set("Q6_K", "Llama-3.2-3B-Instruct-Q6_K");
        llama323bQuant.set("Q4F16_1", "Llama-3.2-3B-Instruct-q4f16_1");
        this.LLAMA_3_2_3B = new ModelQuantization("Llama-3.2-3B-Instruct", llama323bQuant);

        // Initialize MISTRAL_7B
        const mistralQuant = new Map<string, string>();
        mistralQuant.set("Q4F16_1", "Mistral-7B-Instruct-v0.3-q4f16_1");
        this.MISTRAL_7B = new ModelQuantization("Mistral-7B-Instruct-v0.3", mistralQuant);

        // Initialize MIXTRAL_8X7B
        const mixtralQuant = new Map<string, string>();
        mixtralQuant.set("Q4F16_1", "Mixtral-8x7B-Instruct-v0.1-q4f16_1");
        this.MIXTRAL_8X7B = new ModelQuantization("Mixtral-8x7B-Instruct-v0.1", mixtralQuant);

        // Initialize GEMMA models
        const gemma22bQuant = new Map<string, string>();
        gemma22bQuant.set("Q4F16_1", "gemma-2-2b-it-q4f16_1");
        this.GEMMA_2_2B = new ModelQuantization("gemma-2-2b-it", gemma22bQuant);

        const gemma27bQuant = new Map<string, string>();
        gemma27bQuant.set("Q4F16_1", "gemma-2-27b-it-q4f16_1");
        this.GEMMA_2_7B = new ModelQuantization("gemma-2-27b-it", gemma27bQuant);

        const gemma29bQuant = new Map<string, string>();
        gemma29bQuant.set("Q4F16_1", "gemma-2-9b-it-q4f16_1");
        this.GEMMA_2_9B = new ModelQuantization("gemma-2-9b-it", gemma29bQuant);
    }

    toString(): string {
        const obj: Map<string, ModelQuantization> = new Map();
        obj.set("LLAMA_3_2_1B", this.LLAMA_3_2_1B);
        obj.set("LLAMA_3_2_3B", this.LLAMA_3_2_3B);
        obj.set("MISTRAL_7B", this.MISTRAL_7B);
        obj.set("MIXTRAL_8X7B", this.MIXTRAL_8X7B);
        obj.set("GEMMA_2_2B", this.GEMMA_2_2B);
        obj.set("GEMMA_2_7B", this.GEMMA_2_7B);
        obj.set("GEMMA_2_9B", this.GEMMA_2_9B);
        return JSON.stringify(obj);
    }
}

// Singleton instance of SupportedModels
export const MODELS = new SupportedModels();

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

    chat(prompt: string): string | null {
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
