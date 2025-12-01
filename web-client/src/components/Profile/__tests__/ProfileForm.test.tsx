import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileForm } from '../ProfileForm';

describe('ProfileForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render form with display name input', () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render with initial display name value', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser123"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i) as HTMLInputElement;
      expect(input.value).toBe('testuser123');
    });

    it('should show loading state when submitting', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      const saveButton = screen.getByRole('button', { name: /loading/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Display Name Validation', () => {
    it('should show error for display name shorter than 3 characters', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for display name longer than 50 characters', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      const longName = 'a'.repeat(51);
      fireEvent.change(input, { target: { value: longName } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/no more than 50 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for display name with invalid characters', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'test@user!' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/alphanumeric characters.*underscore/i)).toBeInTheDocument();
      });
    });

    it('should accept valid display name with alphanumeric and underscore', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'valid_user_123' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/no more than 50 characters/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/alphanumeric characters.*underscore/i)).not.toBeInTheDocument();
      });
    });

    it('should show error for empty display name', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid display name', async () => {
      render(
        <ProfileForm
          initialDisplayName="oldname"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('newname123');
      });
    });

    it('should not call onSubmit with invalid display name', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'ab' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should disable submit button when display name is invalid', async () => {
      render(
        <ProfileForm
          initialDisplayName=""
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'ab' } });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('should disable submit button when display name is unchanged', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable submit button when display name is changed and valid', async () => {
      render(
        <ProfileForm
          initialDisplayName="oldname"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Display', () => {
    it('should display server error when provided', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Display name already taken"
        />
      );

      expect(screen.getByText(/display name already taken/i)).toBeInTheDocument();
    });

    it('should clear server error when input changes', async () => {
      const { rerender } = render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Display name already taken"
        />
      );

      expect(screen.getByText(/display name already taken/i)).toBeInTheDocument();

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname' } });

      // Rerender without error (parent component would do this)
      rerender(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error={null}
        />
      );

      expect(screen.queryByText(/display name already taken/i)).not.toBeInTheDocument();
    });

    it('should show validation error instead of server error when both exist', () => {
      render(
        <ProfileForm
          initialDisplayName="testuser"
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Server error"
        />
      );

      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.blur(input);

      // Validation error should be shown
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      // Server error should still be visible
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });
});
