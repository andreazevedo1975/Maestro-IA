// types.ts

export interface Source {
  title: string;
  uri: string;
}

export interface InstrumentStem {
  instrument: string;
  description: string;
  audio: string; // base64 encoded audio
  tablature?: string; // Tablatura ou descrição do padrão rítmico
}

export interface SongSection {
  part: string;
  description: string;
  chords: string[];
}

export interface AnalysisResult {
  songTitle: string;
  artist: string;
  summary: string;
  key: string;
  bpm: number;
  timeSignature: string;
  chords: string[];
  mainMelodyAudio: string; // base64 encoded audio
  instrumentStems: InstrumentStem[];
  sections: SongSection[];
  lyrics: string;
  previewUrl?: string;
  sources: Source[];
}
