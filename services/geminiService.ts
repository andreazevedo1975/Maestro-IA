// services/geminiService.js

import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for the main text-based analysis (Stage 1) - Kept for reference in the prompt
const textAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    songTitle: { type: Type.STRING },
    artist: { type: Type.STRING },
    summary: { type: Type.STRING, description: "Um resumo conciso do estilo musical, clima e instrumentação da música." },
    key: { type: Type.STRING, description: "A tonalidade da música (ex: 'C Major')." },
    bpm: { type: Type.NUMBER, description: "O tempo em batidas por minuto." },
    timeSignature: { type: Type.STRING, description: "A fórmula de compasso (ex: '4/4')." },
    chords: {
      type: Type.ARRAY,
      description: "A progressão de acordes principal, como um array de strings.",
      items: { type: Type.STRING }
    },
    lyrics: { type: Type.STRING, description: "A letra completa da música com cifras embutidas entre colchetes. Ex: '[Am]Eu sei que vou te amar...'" },
    previewUrl: { type: Type.STRING, description: "Um link do YouTube para a música. Deve ser um link de vídeo válido (watch?v=... ou youtu.be/...). Se não encontrar, retorne uma string vazia." },
    melodyDescription: { type: Type.STRING, description: "Uma descrição textual curta e cantarolável da melodia principal para ser usada em um prompt de Text-to-Speech. Ex: 'A melodia principal sobe e desce suavemente com a letra 'Olha que coisa mais linda...'." },
    instrumentStemDescriptions: {
      type: Type.ARRAY,
      description: "Descrições textuais para 2 a 4 instrumentos proeminentes para usar em prompts de Text-to-Speech.",
      items: {
        type: Type.OBJECT,
        properties: {
          instrument: { type: Type.STRING, description: "Nome do instrumento (ex: 'Violão', 'Bateria', 'Voz', 'Baixo')." },
          description: { type: Type.STRING, description: "Descrição do que o instrumento está tocando. Ex: 'O violão toca uma batida de Bossa Nova com os acordes principais.'." },
          tablature: { type: Type.STRING, description: "Uma tablatura simplificada em texto da parte principal do instrumento. Para bateria ou percussão, descreva o padrão rítmico principal textualmente (ex: 'Bumbo: 1 e 3 | Caixa: 2 e 4'). Para vocais, pode ser deixado em branco." }
        },
        required: ['instrument', 'description']
      }
    },
    sections: {
        type: Type.ARRAY,
        description: "A estrutura da música dividida em seções como Verso, Refrão, etc.",
        items: {
            type: Type.OBJECT,
            properties: {
                part: { type: Type.STRING, description: "O nome da seção (ex: 'Verso 1', 'Refrão')." },
                description: { type: Type.STRING, description: "Uma breve descrição das características musicais da seção." },
                chords: {
                    type: Type.ARRAY,
                    description: "Um array de acordes usados nesta seção.",
                    items: { type: Type.STRING }
                }
            },
            required: ['part', 'description', 'chords']
        }
    }
  },
  required: ['songTitle', 'artist', 'summary', 'key', 'bpm', 'timeSignature', 'chords', 'lyrics', 'previewUrl', 'melodyDescription', 'instrumentStemDescriptions', 'sections']
};

async function generateAudioFromText(prompt) {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Gere um áudio de: ${prompt}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
    } catch (error) {
        console.warn(`Falha ao gerar áudio para o prompt: "${prompt}"`, error);
        return ''; // Return empty string on failure to not break the main flow
    }
}

export async function analyzeMusicTrack(song, artist) {
  const prompt = `
    Analise de forma profunda as propriedades musicais da canção "${song}" de "${artist}".
    Use a busca na web para encontrar informações precisas sobre a letra, cifras e estrutura da música.
    Sua análise deve incluir:
    1. Um resumo do estilo musical, clima e instrumentação.
    2. A tonalidade, o tempo em BPM e a fórmula de compasso.
    3. A progressão de acordes principal.
    4. A letra completa com as cifras embutidas (ex: [Am]Letra).
    5. A estrutura da música (Intro, Verso, Refrão, etc.) com descrições e acordes.
    6. Um link do YouTube para a música.
    7. Descrições textuais otimizadas para Text-to-Speech (TTS) da melodia principal e de 2-4 instrumentos chave. Para cada instrumento, forneça também uma tablatura simplificada (para instrumentos de corda/tecla) ou uma descrição do padrão rítmico (para bateria).

    Você DEVE retornar o resultado como um único objeto JSON.
    Não inclua markdown (como \`\`\`json) ou qualquer formatação. Apenas o JSON puro. O JSON deve aderir à seguinte estrutura: ${JSON.stringify(textAnalysisSchema)}
  `;

  try {
    // Stage 1: Get all textual information and descriptions for audio generation
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.1,
        tools: [{googleSearch: {}}],
        thinkingConfig: { thinkingBudget: 32768 }
      },
    });
    
    // Robust JSON parsing to handle potential markdown wrappers or other text
    const responseText = textResponse.text;
    let jsonText;

    const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        jsonText = markdownMatch[1];
    } else {
        const jsonStartIndex = responseText.indexOf('{');
        const jsonEndIndex = responseText.lastIndexOf('}');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
            throw new Error("A IA não retornou um JSON válido na resposta. O conteúdo recebido não parece conter um objeto JSON.");
        }
        
        jsonText = responseText.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    
    const textResult = JSON.parse(jsonText);
    
    if (!textResult || Object.keys(textResult).length === 0) {
        throw new Error("A IA retornou uma resposta vazia.");
    }
    
    const sources = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web) => !!web?.uri && !!web.title)
      .map(({ uri, title }) => ({ uri, title })) ?? [];

    // Stage 2: Generate all audio stems in parallel
    const audioGenerationPromises = [
      generateAudioFromText(textResult.melodyDescription),
      ...textResult.instrumentStemDescriptions.map((desc) => generateAudioFromText(desc.description))
    ];
    
    const [mainMelodyAudio, ...instrumentAudios] = await Promise.all(audioGenerationPromises);

    const instrumentStems = textResult.instrumentStemDescriptions.map((desc, index) => ({
      instrument: desc.instrument,
      description: desc.description,
      tablature: desc.tablature,
      audio: instrumentAudios[index] || '',
    }));

    return {
        ...textResult,
        mainMelodyAudio,
        instrumentStems,
        sources,
    };

  } catch (error) {
    console.error("Erro ao analisar a música:", error);
    if (error instanceof Error && (error.message.includes('JSON.parse') || error.message.includes('JSON válido'))) {
         throw new Error("A IA retornou uma resposta em formato inválido. Por favor, tente novamente.");
    }
    throw new Error("Falha ao analisar a música. A IA pode estar sobrecarregada ou a música é muito desconhecida.");
  }
}