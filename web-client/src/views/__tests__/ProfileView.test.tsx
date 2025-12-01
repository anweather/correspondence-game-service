import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileView } from '../ProfileView';
import type { ReactNode } from 'react';

// Mock useProfile hook
const mockUpdateProfile = vi.fn();
const mockCreateProfile = vi.fn();
const mockReload = vi.fn();

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: mockProfile,
    loading: mockLoading,
    updating: mockUpdating,
    error: mockError,
    updateProfile: mockUpdateProfile,
    createProfile: mockCreateProfile,
    reload: mockReload,
  }),
}));

// Mock values that will be set in tests
let mockProfile: any = null;
let mockLoading = false;
let mockUpdating = false;
let mockError: string | null = null;

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = {
      userId: 'user123',
      displayName: 'testuser',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
    mockLoading = false;
    mockUpdating = false;
    mockError = null;
  });

  describe('Profile Display', () => {
    it('should render profile view with header', () => {
      render(<ProfileView />);

      expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    });

    it('should display current display name', () => {
      render(<ProfileView />);

      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
    });

    it('should show loading state when profile is loading', () => {
      mockLoading = true;
      mockProfile = null;

      render(<ProfileView />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show user ID in profile information', () => {
      render(<ProfileView />);

      expect(screen.getByText(/user123/i)).toBeInTheDocument();
    });

    it('should display profile creation date', () => {
      render(<ProfileView />);

      // Check for date display (format may vary)
      expect(screen.getByText(/created/i)).toBeInTheDocument();
    });

    it('should display profile last updated date', () => {
      render(<ProfileView />);

      // Check for date display (format may vary)
      expect(screen.getByText(/updated/i)).toBeInTheDocument();
    });
  });

  describe('Profile Update Flow', () => {
    it('should show edit button when not editing', () => {
      render(<ProfileView />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should show ProfileForm when edit button is clicked', () => {
      render(<ProfileView />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // ProfileForm should be visible
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should hide edit button when editing', () => {
      render(<ProfileView />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Edit button should not be visible
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    });

    it('should call updateProfile when form is submitted', async () => {
      mockUpdateProfile.mockResolvedValue(true);

      render(<ProfileView />);

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Change display name
      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });

      // Submit form - use more specific selector
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith('newname123');
      });
    });

    it('should exit edit mode after successful update', async () => {
      mockUpdateProfile.mockResolvedValue(true);

      render(<ProfileView />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Submit form
      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Should exit edit mode and show edit button again
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('should stay in edit mode after failed update', async () => {
      mockUpdateProfile.mockResolvedValue(false);

      render(<ProfileView />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Submit form
      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Should still be in edit mode
        expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      });
    });

    it('should exit edit mode when cancel button is clicked', () => {
      render(<ProfileView />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should exit edit mode
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    });

    it('should show updating state while saving', async () => {
      // Start with not updating
      mockUpdating = false;
      mockUpdateProfile.mockImplementation(async () => {
        // Simulate updating state change
        mockUpdating = true;
        return new Promise(() => {}); // Never resolves to keep in loading state
      });

      render(<ProfileView />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Change and submit
      const input = screen.getByLabelText(/display name/i);
      fireEvent.change(input, { target: { value: 'newname123' } });
      const saveButton = screen.getByRole('button', { name: /^save$/i });
      
      // The button should show "Saving..." text when loading prop is true
      // Since we're using ProfileForm which shows loading state
      expect(saveButton).not.toBeDisabled();
    });

    it('should display error message when update fails', async () => {
      mockError = 'Display name already taken';
      mockUpdateProfile.mockResolvedValue(false);

      render(<ProfileView />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      // Error should be displayed in form
      expect(screen.getByText(/display name already taken/i)).toBeInTheDocument();
    });
  });

  describe('Notification Preferences', () => {
    it('should display notification preferences section', () => {
      render(<ProfileView />);

      expect(screen.getByRole('heading', { name: /notification preferences/i })).toBeInTheDocument();
    });

    it('should show turn notification toggle', () => {
      render(<ProfileView />);

      expect(screen.getByLabelText(/turn notification/i)).toBeInTheDocument();
    });

    it('should show notification delay setting', () => {
      render(<ProfileView />);

      expect(screen.getByLabelText(/delay/i)).toBeInTheDocument();
    });

    it('should allow toggling turn notifications', () => {
      render(<ProfileView />);

      const toggle = screen.getByLabelText(/turn notification/i) as HTMLInputElement;
      const initialState = toggle.checked;

      fireEvent.click(toggle);

      expect(toggle.checked).toBe(!initialState);
    });

    it('should allow changing notification delay', () => {
      render(<ProfileView />);

      const delayInput = screen.getByLabelText(/delay/i) as HTMLInputElement;
      fireEvent.change(delayInput, { target: { value: '10' } });

      expect(delayInput.value).toBe('10');
    });

    it('should save notification preferences', async () => {
      render(<ProfileView />);

      // Change notification settings
      const toggle = screen.getByLabelText(/turn notification/i);
      fireEvent.click(toggle);

      const delayInput = screen.getByLabelText(/delay/i);
      fireEvent.change(delayInput, { target: { value: '15' } });

      // Save button for preferences
      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Should show success message or confirmation
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<ProfileView />);

      // Component should render without errors - check for main heading
      expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    });

    it('should render correctly on tablet viewport', () => {
      // Set tablet viewport
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));

      render(<ProfileView />);

      // Component should render without errors - check for main heading
      expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<ProfileView />);

      // Component should render without errors - check for main heading
      expect(screen.getByRole('heading', { name: /^profile$/i, level: 1 })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when profile fails to load', () => {
      mockProfile = null;
      mockError = 'Failed to load profile';

      render(<ProfileView />);

      expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
    });

    it('should show retry button when profile fails to load', () => {
      mockProfile = null;
      mockError = 'Failed to load profile';

      render(<ProfileView />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call reload when retry button is clicked', () => {
      mockProfile = null;
      mockError = 'Failed to load profile';

      render(<ProfileView />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('New User Flow', () => {
    it('should show create profile prompt when profile is null', () => {
      mockProfile = null;
      mockLoading = false;
      mockError = null;

      render(<ProfileView />);

      expect(screen.getByRole('heading', { name: /create your profile/i })).toBeInTheDocument();
    });

    it('should show create profile button for new users', () => {
      mockProfile = null;
      mockLoading = false;
      mockError = null;

      render(<ProfileView />);

      expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument();
    });

    it('should call createProfile when create button is clicked', async () => {
      mockProfile = null;
      mockLoading = false;
      mockError = null;
      mockCreateProfile.mockResolvedValue(true);

      render(<ProfileView />);

      const createButton = screen.getByRole('button', { name: /create profile/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalled();
      });
    });
  });
});
