/**
 * Test utilities for React component testing
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a new QueryClient for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component with all providers
 */
interface AllProvidersProps {
  children: React.ReactNode;
}

export function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Mock user profile for testing
 */
export const mockUserProfile = {
  userId: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  age: 30,
  state: 'Maharashtra',
  district: 'Mumbai',
  occupation: 'Software Engineer',
};

/**
 * Mock scheme for testing
 */
export const mockScheme = {
  schemeId: 'scheme-123',
  schemeName: 'Test Education Scheme',
  shortDescription: 'A test scheme for education',
  category: 'education',
  sponsoredBy: 'Ministry of Education',
  isActive: true,
};

/**
 * Mock recommendation for testing
 */
export const mockRecommendation = {
  schemeId: 'scheme-123',
  schemeName: 'Test Education Scheme',
  relevanceScore: 0.85,
  matchingCriteria: ['age', 'education', 'income'],
  explanation: 'This scheme matches your profile based on age, education, and income',
  eligibilityScore: 85,
};

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock WebSocket for testing
 */
export class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

/**
 * Mock fetch for API testing
 */
export function mockFetch(response: any, status: number = 200) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    } as Response)
  );
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  vi.clearAllMocks();
  vi.resetAllMocks();
}
