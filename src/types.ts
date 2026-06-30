export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface ApiStatus {
  status: string;
  config: {
    hasCustom: boolean;
    customModel: string;
    hasGemini: boolean;
  };
}
