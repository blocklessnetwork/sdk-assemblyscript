import { Console } from "as-wasi/assembly";
import { llm } from "../assembly";

const options = new llm.LlmOptions(
    "You are a helpful assistant. First time I ask, your name will be Lucy. Second time I ask, your name will be Bob.",
    -1, // temperature; not set
    -1 // topP; not set
);

// Initialize the LLM model with a specific model name
const model = new llm.BlocklessLlm(
    "Llama-3.1-8B-Instruct-q4f32_1-MLC",
    options
);

// Get the current model name
const modelName = model.getModel();
Console.log("Using model: " + modelName!);

// First chat request
const response1 = model.chatRequest("What is your name?");
Console.log("First response: " + response1!);

// Second chat request
const response2 = model.chatRequest("What is your name?");
Console.log("Second response: " + response2!);

// Get current options to verify state
const currentOptions = model.getOptions();
Console.log("\nCurrent model configuration:");
Console.log("System Message: " + currentOptions!.systemMessage);

// Clean up
model.close();
