import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemplateEditor from './TemplateEditor';

// Mock the TipTap editor
vi.mock('@tiptap/react', () => ({
  useEditor: () => ({
    getHTML: () => '<p>Mock editor content</p>',
    getText: () => 'Mock editor content',
    getJSON: () => ({ content: [] }),
    isActive: vi.fn(() => false),
    commands: {
      setContent: vi.fn(),
      clearContent: vi.fn(),
    },
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleUnderline: () => ({ run: vi.fn() }),
        setTextAlign: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
        insertTable: () => ({ run: vi.fn() }),
      }),
    }),
    destroy: vi.fn(),
  }),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">
      <textarea 
        placeholder="Rich text content will appear here..." 
        defaultValue="Mock editor content"
      />
    </div>
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Bold: () => <div data-testid="bold-icon" />,
  Italic: () => <div data-testid="italic-icon" />,
  Underline: () => <div data-testid="underline-icon" />,
  List: () => <div data-testid="list-icon" />,
  ListOrdered: () => <div data-testid="list-ordered-icon" />,
  AlignLeft: () => <div data-testid="align-left-icon" />,
  AlignCenter: () => <div data-testid="align-center-icon" />,
  AlignRight: () => <div data-testid="align-right-icon" />,
  Table: () => <div data-testid="table-icon" />,
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Download: () => <div data-testid="download-icon" />,
}));

const mockDefaultTemplates = [
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
];

const mockUserTemplates = [
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
];

const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  defaultTemplates: mockDefaultTemplates,
  userTemplates: mockUserTemplates,
  selectedVoiceProfile: {
    id: 1,
    name: 'Test Profile',
    description: 'Test voice profile'
  }
};

const renderWithQueryClient = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TemplateEditor', () => {
  it('renders the template editor modal with title', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Template Editor')).toBeInTheDocument();
  });

  it('displays the default templates section', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Select Default Template')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn Post')).toBeInTheDocument();
  });

  it('displays the template description section', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Template Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter AI-optimized prompt for template generation...')).toBeInTheDocument();
  });

  it('displays the template example section with editor', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Template Example')).toBeInTheDocument();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('shows the update description button', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Update Description')).toBeInTheDocument();
  });

  it('displays the previously saved templates section', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Previously Saved Templates')).toBeInTheDocument();
    expect(screen.getByText('My Custom Template')).toBeInTheDocument();
  });

  it('shows the save template section', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    expect(screen.getByText('Save Template')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Template name...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Template/i })).toBeInTheDocument();
  });

  it('enables save button when template name is provided', async () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    const saveButton = screen.getByRole('button', { name: /Save Template/i });
    expect(saveButton).toBeDisabled();
    
    const nameInput = screen.getByPlaceholderText('Template name...');
    fireEvent.change(nameInput, { target: { value: 'My New Template' } });
    
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it('allows editing template name', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    const nameInput = screen.getByPlaceholderText('Template name...');
    fireEvent.change(nameInput, { target: { value: 'My New Template' } });
    
    expect(nameInput).toHaveValue('My New Template');
  });

  it('allows editing template description', () => {
    renderWithQueryClient(<TemplateEditor {...mockProps} />);
    
    const descriptionTextarea = screen.getByPlaceholderText('Enter AI-optimized prompt for template generation...');
    fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });
    
    expect(descriptionTextarea).toHaveValue('Test description');
  });

  it('calls onClose when modal is closed', () => {
    const mockOnClose = vi.fn();
    renderWithQueryClient(<TemplateEditor {...mockProps} onClose={mockOnClose} />);
    
    // Find and click the close button (X icon)
    const closeButton = screen.getByTestId('x-icon').closest('button');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('calls onSave when save button is clicked with valid data', async () => {
    const mockOnSave = vi.fn();
    renderWithQueryClient(<TemplateEditor {...mockProps} onSave={mockOnSave} />);
    
    // Fill in template name
    const nameInput = screen.getByPlaceholderText('Template name...');
    fireEvent.change(nameInput, { target: { value: 'My New Template' } });
    
    // Fill in description
    const descriptionTextarea = screen.getByPlaceholderText('Enter AI-optimized prompt for template generation...');
    fireEvent.change(descriptionTextarea, { target: { value: 'Test description' } });
    
    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Template/i });
    fireEvent.click(saveButton);
    
    // Check that onSave was called with expected data
    expect(mockOnSave).toHaveBeenCalledWith({
      name: 'My New Template',
      description: 'Test description',
      editableContent: '<p>Mock editor content</p>',
      formattingInstructions: 'Use standard formatting without special styling.'
    });
  });
});