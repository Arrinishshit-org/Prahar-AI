export type View = 'home' | 'schemes' | 'assistant' | 'profile' | 'about' | 'partner' | 'contact' | 'login';

export interface Scheme {
  id: string;
  title: string;
  description?: string;
  category: string;
  benefits?: string;
  eligibility: string;
  /** @deprecated kept for backwards compat with mock data */
  benefit?: string;
  deadline?: string;
  status?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  schemes?: Scheme[];
}
