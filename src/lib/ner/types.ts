
export interface NERSpan {
  start: number;
  end: number;
  label: string;
  score: number;
}

export interface NERWorkerMessage {
  id?: string;
  text: string;
  labels?: string[];
  batch?: boolean;
}

export interface NERWorkerResponse {
  type: 'complete' | 'error' | 'progress';
  id?: string;
  spans?: NERSpan[];
  error?: string;
  progress?: number;
}

export interface NERRequest {
  id: string;
  text: string;
  labels?: string[];
  resolve: (spans: NERSpan[]) => void;
  reject: (error: Error) => void;
}
