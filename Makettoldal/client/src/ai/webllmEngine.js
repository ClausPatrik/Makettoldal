// client/src/ai/webllmEngine.js
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let enginePromise = null;

/**
 * Egyszeri engine példány WebLLM-hez.
 * initProgressCallback: ( { progress, text } ) => void
 */
export function getWebLlmEngine(initProgressCallback) {
  if (!enginePromise) {
   const selectedModel = "Llama-3.2-3B-Instruct-q4f16_1-MLC";// kisebb, gyorsabb modell

    enginePromise = CreateMLCEngine(selectedModel, {
      initProgressCallback: (p) => {
        if (initProgressCallback) initProgressCallback(p);
      },
    });
  }
  return enginePromise;
}

