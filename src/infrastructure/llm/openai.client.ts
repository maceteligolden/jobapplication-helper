/**
 * OpenAI clients via LangChain — lazy initialization for build-time safety
 */

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { getOpenAIApiKey, OPENAI_MODELS } from './openai.config';

function baseConfig() {
  return {
    apiKey: getOpenAIApiKey(),
    ...(process.env.OPENAI_ORG_ID ? { organization: process.env.OPENAI_ORG_ID } : {}),
  };
}

let _chatMini: ChatOpenAI | null = null;
let _chatStrong: ChatOpenAI | null = null;
let _embeddings: OpenAIEmbeddings | null = null;

export function getChatMini(): ChatOpenAI {
  if (!_chatMini) {
    _chatMini = new ChatOpenAI({
      ...baseConfig(),
      model: OPENAI_MODELS.FAST,
      temperature: 0,
    });
  }
  return _chatMini;
}

export function getChatStrong(): ChatOpenAI {
  if (!_chatStrong) {
    _chatStrong = new ChatOpenAI({
      ...baseConfig(),
      model: OPENAI_MODELS.STRONG,
      temperature: 0.2,
    });
  }
  return _chatStrong;
}

export function createStreamingChat() {
  return new ChatOpenAI({
    ...baseConfig(),
    model: OPENAI_MODELS.STRONG,
    temperature: 0.3,
    streaming: true,
  });
}

export function getEmbeddings(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({
      ...baseConfig(),
      model: OPENAI_MODELS.EMBEDDING,
    });
  }
  return _embeddings;
}
