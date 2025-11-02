// services/geminiService.js

import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { YouTubeVideo } from '../types.js';

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

function parseJsonResponse(responseText: string) {
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
    
    const result = JSON.parse(jsonText);
    
    if (!result || Object.keys(result).length === 0) {
        throw new Error("A IA retornou uma resposta vazia.");
    }
    return result;
}

async function processAnalysisResult(textResult) {
    // FIX: Ensure instrumentStemDescriptions is an array to prevent crashes if the API omits it.
    const stemDescriptions = Array.isArray(textResult.instrumentStemDescriptions)
        ? textResult.instrumentStemDescriptions
        : [];
    
     // Stage 2: Generate all audio stems in parallel
    const audioGenerationPromises = [
      generateAudioFromText(textResult.melodyDescription),
      ...stemDescriptions.map((desc) => generateAudioFromText(desc.description))
    ];
    
    const [mainMelodyAudio, ...instrumentAudios] = await Promise.all(audioGenerationPromises);

    const instrumentStems = stemDescriptions.map((desc, index) => ({
      instrument: desc.instrument,
      description: desc.description,
      tablature: desc.tablature,
      audio: instrumentAudios[index] || '',
    }));
    
    return {
        ...textResult,
        mainMelodyAudio,
        instrumentStems
    };
}


export async function analyzeMusicTrack(song, artist) {
  const prompt = `
    Analise de forma profunda as propriedades musicais da canção "${song}" de "${artist}".
    Use a busca na web para encontrar informações precisas sobre a letra, cifras e estrutura da música. É CRÍTICO que você encontre e retorne a letra com as cifras.

    Sua análise DEVE incluir:
    1. A progressão de acordes principal (campo 'chords'). Este campo é OBRIGATÓRIO.
    2. A letra COMPLETA da música com as cifras embutidas no formato '[Am]Letra...' (campo 'lyrics'). Este campo é OBRIGATÓRIO. Se não encontrar as cifras, retorne a letra pura, mas a prioridade máxima é encontrar a versão com cifras.
    3. Um resumo do estilo musical, clima e instrumentação.
    4. A tonalidade, o tempo em BPM e a fórmula de compasso.
    5. A estrutura da música (Intro, Verso, Refrão, etc.) com descrições e acordes para cada seção.
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
    
    const responseText = textResponse.text;

    if (!responseText) {
        const feedback = textResponse.promptFeedback;
        if (feedback?.blockReason) {
            throw new Error(`A análise foi bloqueada. Motivo: ${feedback.blockReason}. Tente uma música diferente.`);
        }
        throw new Error("A IA não retornou uma resposta. A música pode ser muito desconhecida ou a API pode estar com problemas. Tente novamente.");
    }

    const textResult = parseJsonResponse(responseText);
    
    const sources = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web) => !!web?.uri && !!web.title)
      .map(({ uri, title }) => ({ uri, title })) ?? [];

    const fullResult = await processAnalysisResult(textResult);

    return {
        ...fullResult,
        sources,
    };

  } catch (error) {
    console.error("Erro ao analisar a música:", error);
    if (error instanceof Error) {
        // Let our custom user-friendly errors pass through
        if (error.message.startsWith('A análise foi bloqueada') || 
            error.message.startsWith('A IA não retornou uma resposta')) {
            throw error;
        }
        if (error.message.includes('JSON.parse') || error.message.includes('JSON válido')) {
             throw new Error("A IA retornou uma resposta em formato inválido. Por favor, tente novamente.");
        }
    }
    // Generic fallback for other errors
    throw new Error("Falha ao analisar a música. A IA pode estar sobrecarregada ou a música é muito desconhecida.");
  }
}

async function fileToGenerativePart(file: File) {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

export async function analyzeAudioFile(file: File) {
    const audioPart = await fileToGenerativePart(file);

    const prompt = `
      Analise este arquivo de áudio. Tente identificar o título da música e o artista com base em seu conhecimento musical.
      
      Realize uma análise musical profunda DIRETAMENTE da faixa de áudio fornecida. Sua análise é CRÍTICA e deve focar na extração das seguintes informações do som:
      - A progressão de acordes principal (campo 'chords'). Este campo é OBRIGATÓRIO. Analise a harmonia para determinar os acordes.
      - A letra COMPLETA da música (campo 'lyrics'). Transcreva a letra o mais fielmente possível. Se conseguir identificar os acordes harmonicamente, insira-os no formato '[Am]Letra...'. Se não, retorne apenas a letra transcrita. Este campo é OBRIGATÓRIO.
      - A tonalidade, o tempo em BPM e a fórmula de compasso.
      - A estrutura da música (Intro, Verso, Refrão, etc.) com descrições e os acordes que você identificou para cada seção.
      - Um resumo do estilo musical, clima e instrumentação.
      - Descrições textuais otimizadas para Text-to-Speech (TTS) da melodia principal e de 2-4 instrumentos chave.
      - Para cada instrumento, forneça uma tablatura simplificada (para instrumentos de corda/tecla) ou uma descrição do padrão rítmico (para bateria) baseada no que você ouve.
      - Um link do YouTube para a música, se você conseguir identificá-la com alta confiança. Se não, retorne uma string vazia para 'previewUrl'.

      Você DEVE retornar o resultado como um único objeto JSON.
      Não inclua markdown (como \`\`\`json) ou qualquer formatação. Apenas o JSON puro. O JSON deve aderir à seguinte estrutura: ${JSON.stringify(textAnalysisSchema)}
    `;

    try {
        const textResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: { parts: [{ text: prompt }, audioPart] },
            config: {
                temperature: 0.2,
            },
        });
        
        const responseText = textResponse.text;

        if (!responseText) {
            const feedback = textResponse.promptFeedback;
            if (feedback?.blockReason) {
                throw new Error(`A análise foi bloqueada. Motivo: ${feedback.blockReason}. Tente um arquivo diferente.`);
            }
            throw new Error("A IA não retornou uma resposta para este arquivo de áudio. Tente novamente ou use um arquivo diferente.");
        }
        
        const textResult = parseJsonResponse(responseText);
        const fullResult = await processAnalysisResult(textResult);

        // Sources are not available from multimodal requests
        return {
            ...fullResult,
            sources: [],
        };
    } catch (error) {
        console.error("Erro ao analisar o arquivo de áudio:", error);
         if (error instanceof Error) {
            // Let our custom user-friendly errors pass through
            if (error.message.startsWith('A análise foi bloqueada') || 
                error.message.startsWith('A IA não retornou uma resposta')) {
                throw error;
            }
            if (error.message.includes('JSON.parse') || error.message.includes('JSON válido')) {
                 throw new Error("A IA retornou uma resposta em formato inválido. Por favor, tente novamente.");
            }
        }
        throw new Error("Falha ao analisar o arquivo de áudio. O formato pode não ser suportado ou o arquivo está corrompido.");
    }
}

const youtubeSearchSchema = {
    type: Type.OBJECT,
    properties: {
        videos: {
            type: Type.ARRAY,
            description: "A list of relevant YouTube music videos.",
            items: {
                type: Type.OBJECT,
                properties: {
                    videoId: { type: Type.STRING, description: "The unique YouTube video ID." },
                    title: { type: Type.STRING, description: "The title of the video." },
                    thumbnailUrl: { type: Type.STRING, description: "URL of the video's default thumbnail." },
                    channelName: { type: Type.STRING, description: "The name of the YouTube channel that uploaded the video." }
                },
                required: ['videoId', 'title', 'thumbnailUrl', 'channelName']
            }
        }
    },
    required: ['videos']
};


export async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
    const prompt = `
        Search YouTube for music videos matching the query: "${query}".
        Find up to 5 relevant results. For each video, provide its title, video ID, default thumbnail URL, and channel name.
        You MUST return the result as a single JSON object that adheres to this schema: ${JSON.stringify(youtubeSearchSchema)}.
        Do not wrap the JSON in markdown backticks or other formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("A IA não retornou resultados para a busca.");
        }
        
        const result = parseJsonResponse(responseText);
        return result.videos || [];

    } catch (error) {
        console.error("Erro ao buscar no YouTube:", error);
        if (error instanceof Error) {
            if (error.message.startsWith('A IA não retornou')) {
                throw error;
            }
            if (error.message.includes('JSON.parse') || error.message.includes('JSON válido')) {
                 throw new Error("A IA retornou uma resposta em formato inválido para a busca. Tente novamente.");
            }
        }
        throw new Error("Falha ao buscar vídeos no YouTube. Tente novamente.");
    }
}

const titleParseSchema = {
    type: Type.OBJECT,
    properties: {
        song: { type: Type.STRING, description: "The extracted song title. Should be just the title, without the artist name." },
        artist: { type: Type.STRING, description: "The extracted artist name." }
    },
    required: ['song', 'artist']
};


export async function parseVideoTitle(videoTitle: string): Promise<{ song: string; artist: string }> {
    const prompt = `
        From the following YouTube video title, extract the song title and the main artist's name.
        Video Title: "${videoTitle}"
        
        Examples:
        - "Tom Jobim - Garota de Ipanema" -> { "song": "Garota de Ipanema", "artist": "Tom Jobim" }
        - "Arctic Monkeys - Do I Wanna Know? (Official Video)" -> { "song": "Do I Wanna Know?", "artist": "Arctic Monkeys" }
        - "Queen - Bohemian Rhapsody (Official Video Remastered)" -> { "song": "Bohemian Rhapsody", "artist": "Queen" }

        You MUST return the result as a single JSON object that adheres to this schema: ${JSON.stringify(titleParseSchema)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: titleParseSchema,
            },
        });

        const responseText = response.text;
        if (!responseText) {
            throw new Error("Não foi possível extrair as informações do título do vídeo.");
        }
        
        return JSON.parse(responseText);
    } catch (error) {
        console.error("Erro ao extrair informações do título:", error);
        throw new Error("Falha ao processar o título do vídeo selecionado.");
    }
}