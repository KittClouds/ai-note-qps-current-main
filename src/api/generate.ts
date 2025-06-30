
import { geminiLLMService } from '@/lib/generative-ai/geminiLLMService';

export async function POST(request: Request) {
  try {
    const { prompt, option, command } = await request.json();
    
    const response = await geminiLLMService.generateText(prompt, option, command);
    
    return response;
  } catch (error) {
    console.error('Error in generate API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
