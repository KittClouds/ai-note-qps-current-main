
import { match } from "ts-pattern";

// Define the structure for the Gemini API payload
interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiSystemInstruction {
  parts: GeminiPart[];
}

interface GeminiPayload {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export class GeminiLLMService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-2.5-flash-lite-preview-06-17';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.apiKey = localStorage.getItem('gemini_api_key');
    if (!this.apiKey) {
      console.warn('[GeminiLLM] API key not found. Please configure it in API settings.');
    }
  }

  public async generateText(prompt: string, option: string, command?: string): Promise<Response> {
    if (!this.apiKey) {
      this.initialize();
      if (!this.apiKey) {
        return new Response("Missing Gemini API key - please configure it in API Settings.", {
          status: 400,
        });
      }
    }

    // Use ts-pattern to select the appropriate system instruction and user prompt
    const { systemPrompt, userPrompt } = match(option)
      .with("continue", () => ({
        systemPrompt:
          "You are an AI writing assistant that continues existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
        userPrompt: prompt,
      }))
      .with("improve", () => ({
        systemPrompt:
          "You are an AI writing assistant that improves existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
        userPrompt: `The existing text is: ${prompt}`,
      }))
      .with("shorter", () => ({
        systemPrompt:
          "You are an AI writing assistant that shortens existing text. " + "Use Markdown formatting when appropriate.",
        userPrompt: `The existing text is: ${prompt}`,
      }))
      .with("longer", () => ({
        systemPrompt:
          "You are an AI writing assistant that lengthens existing text. " + "Use Markdown formatting when appropriate.",
        userPrompt: `The existing text is: ${prompt}`,
      }))
      .with("fix", () => ({
        systemPrompt:
          "You are an AI writing assistant that fixes grammar and spelling errors in existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
        userPrompt: `The existing text is: ${prompt}`,
      }))
      .with("zap", () => ({
        systemPrompt:
          "You are an AI writing assistant that generates text based on a prompt. " +
          "You take an input from the user and a command for manipulating the text. " +
          "Use Markdown formatting when appropriate.",
        userPrompt: `For this text: ${prompt}. You have to respect the command: ${command}`,
      }))
      .run();

    // Construct the payload in the format Gemini's REST API expects
    const geminiPayload: GeminiPayload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 1.0,
      }
    };

    // Call the Gemini API using native fetch
    const url = `${this.baseUrl}/${this.model}:streamGenerateContent?alt=sse`;

    try {
      const apiResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(geminiPayload),
      });

      // Handle potential errors from the API
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        return new Response(`Gemini API error: ${apiResponse.status} ${errorText}`, {
          status: apiResponse.status,
        });
      }

      // Return the streaming response with appropriate headers
      return new Response(apiResponse.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });

    } catch (error: any) {
      return new Response(`Error calling Gemini API: ${error.message}`, { status: 500 });
    }
  }

  public reinitialize(): void {
    this.initialize();
  }

  public isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const geminiLLMService = new GeminiLLMService();
