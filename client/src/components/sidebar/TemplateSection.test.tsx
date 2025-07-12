import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemplateSection from './TemplateSection';
import { ChatContext } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', email: 'test@example.com' }
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ content: 'Generated content' })
  })
}));

vi.mock('@/contexts/ChatContext', () => ({
  useChatContext: () => mockChatContext,
  ChatContext: React.createContext({})
}));

const mockTemplateData = {
  default: [
    {
      id: 1,
      userId: null,
      name: 'Email',
      description: 'Professional email template',
      templateType: 'email',
      example: 'Dear [Name],\n\nI hope this email finds you well.',
      editableContent: 'Dear [Name],\n\nI hope this email finds you well.',
      formattingInstructions: 'Use formal tone',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: null,
      name: 'LinkedIn Post',
      description: 'Professional LinkedIn post template',
      templateType: 'linkedin_post',
      example: 'Excited to share...',
      editableContent: 'Excited to share...',
      formattingInstructions: 'Use engaging tone',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  user: [
    {
      id: 3,
      userId: 1,
      name: 'My Custom Template',
      description: 'Custom template description',
      templateType: 'custom',
      example: 'Custom content...',
      editableContent: 'Custom content...',
      formattingInstructions: 'Custom instructions',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

const mockChatContext = {
  selectedTemplate: null,
  setSelectedTemplate: vi.fn(),
  selectedVoiceProfile: {
    id: 1,
    name: 'Test Profile',
    description: 'Test voice profile'
  },
  setSelectedVoiceProfile: vi.fn(),
  chatHistory: [],
  setChatHistory: vi.fn(),
  isStreaming: false,
  setIsStreaming: vi.fn(),
  conversations: [],
  setConversations: vi.fn(),
  selectedConversation: null,
  setSelectedConversation: vi.fn(),
  voiceProfiles: [],
  setVoiceProfiles: vi.fn(),
  templates: [],
  setTemplates: vi.fn(),
  templateOutput: '',
  setTemplateOutput: vi.fn()
};

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ChatContext.Provider value={mockChatContext}>
        {component}
      </ChatContext.Provider>
    </QueryClientProvider>
  );
};

describe('TemplateSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch for template data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockTemplateData)
    });
  });

  it('renders template section with header and create button', async () => {
    renderWithProviders(<TemplateSection />);
    
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plus/i })).toBeInTheDocument();
  });

  it('opens template editor modal when create button is clicked', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Template Editor')).toBeInTheDocument();
    });
  });

  it('displays all required template editor sections', async () => {
    renderWithProviders(<TemplateSection />);
    
    // Open modal
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      // Check for all required sections
      expect(screen.getByText('Select Default Template')).toBeInTheDocument();
      expect(screen.getByText('Template Description')).toBeInTheDocument();
      expect(screen.getByText('Template Example')).toBeInTheDocument();
      expect(screen.getByText('Previously Saved Templates')).toBeInTheDocument();
      expect(screen.getByText('Save Template')).toBeInTheDocument();
    });
  });

  it('displays default templates in grid layout', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn Post')).toBeInTheDocument();
    });
  });

  it('shows template description textarea', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const descriptionTextarea = screen.getByPlaceholderText(/AI-optimized prompt/i);
      expect(descriptionTextarea).toBeInTheDocument();
    });
  });

  it('shows template example editor with update description button', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const exampleTextarea = screen.getByPlaceholderText(/Rich text content will appear/i);
      expect(exampleTextarea).toBeInTheDocument();
      expect(screen.getByText('Update Description')).toBeInTheDocument();
    });
  });

  it('shows save template section with name input and save button', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(/Template name/i);
      expect(nameInput).toBeInTheDocument();
      expect(screen.getByText('Save Template')).toBeInTheDocument();
    });
  });

  it('allows editing template name', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(/Template name/i);
      fireEvent.change(nameInput, { target: { value: 'My New Template' } });
      expect(nameInput).toHaveValue('My New Template');
    });
  });

  it('allows editing template description', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const descriptionTextarea = screen.getByPlaceholderText(/AI-optimized prompt/i);
      fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });
      expect(descriptionTextarea).toHaveValue('Test description');
    });
  });

  it('allows editing template content', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const contentTextarea = screen.getByPlaceholderText(/Rich text content will appear/i);
      fireEvent.change(contentTextarea, { target: { value: 'Test content' } });
      expect(contentTextarea).toHaveValue('Test content');
    });
  });

  it('enables save button when template name is provided', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /Save Template/i });
      expect(saveButton).toBeDisabled();
      
      const nameInput = screen.getByPlaceholderText(/Template name/i);
      fireEvent.change(nameInput, { target: { value: 'My New Template' } });
      
      expect(saveButton).toBeEnabled();
    });
  });

  it('shows previously saved templates section', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Previously Saved Templates')).toBeInTheDocument();
    });
  });

  it('shows update description button in template example section', async () => {
    renderWithProviders(<TemplateSection />);
    
    const createButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      const updateButton = screen.getByRole('button', { name: /Update Description/i });
      expect(updateButton).toBeInTheDocument();
    });
  });
});