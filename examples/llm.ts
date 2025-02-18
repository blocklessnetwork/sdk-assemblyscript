import { Console } from "as-wasi/assembly";
import { llm } from "../assembly";

const options = new llm.LlmOptions(
    "You are a helpful assistant. First time I ask, your name will be Lucy. Second time I ask, your name will be Bob.",
    -1, // temperature; not set
    -1 // topP; not set
);

// Initialize the LLM model with a specific model name
const model = new llm.BlocklessLlm(llm.MODELS.LLAMA_3_2_1B.DEFAULT, options);

// Get the current model name
const modelName = model.getModel();
Console.log("Using model: " + modelName!);

// First chat request
const response1 = model.chat("What is your name?");
Console.log("First response: " + response1!);

// Second chat request
const response2 = model.chat("What is your name?");
Console.log("Second response: " + response2!);

// Get current options to verify state
const currentOptions = model.getOptions();
Console.log("\nCurrent model configuration:");
Console.log("System Message: " + currentOptions!.systemMessage);

// Clean up
model.close();
