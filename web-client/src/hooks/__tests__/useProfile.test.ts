import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfile } from '../useProfile';

// Mock the GameClient module
const mockGetProfile = vi.fn();
const mockCreateProfile = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getProfile = mockGetProfile;
      createProfile = mockCreateProfile;
      updateProfile = mockUpdateProfile;
    },
  };
});

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('profile loading', () => {
    it('should initialize with loading true and no profile', () => {
      const { result } = renderHook(() => useProfile());

      expect(result.current.loading).toBe(true);
      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should load profile on mount', async () => {
      const mockProfile = {
        userId: 'user_123',
        displayName: 'testuser',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockGetProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(mockGetProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle profile not found (404)', async () => {
      const error = new Error('Profile not found');
      (error as any).status = 404;
      mockGetProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull(); // 404 is not treated as error
      expect(mockGetProfile).toHaveBeenCalledTimes(1);
    });

    it('should set error on load failure (non-404)', async () => {
      const errorMessage = 'Network error';
      mockGetProfile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('profile caching', () => {
    it('should cache profile in localStorage after loading', async () => {
      const mockProfile = {
        userId: 'user_123',
        displayName: 'testuser',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockGetProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Check localStorage
      const cached = localStorage.getItem('playerProfile');
      expect(cached).toBeTruthy();
      const parsedCache = JSON.parse(cached!);
      expect(parsedCache.userId).toBe(mockProfile.userId);
      expect(parsedCache.displayName).toBe(mockProfile.displayName);
    });

    it('should load from cache on mount if available', () => {
      const cachedProfile = {
        userId: 'user_123',
        displayName: 'cached_user',
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString(),
      };

      localStorage.setItem('playerProfile', JSON.stringify(cachedProfile));

      const { result } = renderHook(() => useProfile());

      // Should immediately have cached profile
      expect(result.current.profile).toBeTruthy();
      expect(result.current.profile?.displayName).toBe('cached_user');
      expect(result.current.loading).toBe(true); // Still loading fresh data
    });

    it('should update cache when profile is updated', async () => {
      const initialProfile = {
        userId: 'user_123',
        displayName: 'oldname',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedProfile = {
        ...initialProfile,
        displayName: 'newname',
        updatedAt: new Date('2024-01-02'),
      };

      mockGetProfile.mockResolvedValue(initialProfile);
      mockUpdateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Update profile
      await result.current.updateProfile('newname');

      await waitFor(() => {
        expect(result.current.profile?.displayName).toBe('newname');
      });

      // Check cache updated
      const cached = localStorage.getItem('playerProfile');
      const parsedCache = JSON.parse(cached!);
      expect(parsedCache.displayName).toBe('newname');
    });

    it('should clear cache on error', async () => {
      const cachedProfile = {
        userId: 'user_123',
        displayName: 'cached_user',
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString(),
      };

      localStorage.setItem('playerProfile', JSON.stringify(cachedProfile));

      mockGetProfile.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Cache should be cleared on error
      expect(localStorage.getItem('playerProfile')).toBeNull();
    });
  });

  describe('profile update', () => {
    it('should update profile successfully', async () => {
      const initialProfile = {
        userId: 'user_123',
        displayName: 'oldname',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedProfile = {
        ...initialProfile,
        displayName: 'newname',
        updatedAt: new Date('2024-01-02'),
      };

      mockGetProfile.mockResolvedValue(initialProfile);
      mockUpdateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.updateProfile('newname');

      expect(success).toBe(true);
      
      await waitFor(() => {
        expect(result.current.profile?.displayName).toBe('newname');
      });
      
      expect(mockUpdateProfile).toHaveBeenCalledWith('newname');
    });

    it('should handle update failure', async () => {
      const initialProfile = {
        userId: 'user_123',
        displayName: 'oldname',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockGetProfile.mockResolvedValue(initialProfile);
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.updateProfile('newname');

      expect(success).toBe(false);
      expect(result.current.profile?.displayName).toBe('oldname'); // Unchanged
      
      await waitFor(() => {
        expect(result.current.error).toBe('Update failed');
      });
    });

    it('should set updating flag during update', async () => {
      const initialProfile = {
        userId: 'user_123',
        displayName: 'oldname',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedProfile = {
        ...initialProfile,
        displayName: 'newname',
        updatedAt: new Date('2024-01-02'),
      };

      mockGetProfile.mockResolvedValue(initialProfile);
      mockUpdateProfile.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedProfile), 100);
          })
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatePromise = result.current.updateProfile('newname');

      // Should be updating
      await waitFor(() => {
        expect(result.current.updating).toBe(true);
      });

      await updatePromise;

      await waitFor(() => {
        expect(result.current.updating).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should clear error when loading profile successfully after error', async () => {
      const mockProfile = {
        userId: 'user_123',
        displayName: 'testuser',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // First call fails
      mockGetProfile.mockRejectedValueOnce(new Error('First error'));

      const { result, rerender } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second call succeeds
      mockGetProfile.mockResolvedValue(mockProfile);

      // Trigger reload
      await result.current.reload();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.profile).toEqual(mockProfile);
      });
    });

    it('should handle unknown error types', async () => {
      mockGetProfile.mockRejectedValue('String error');

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An unknown error occurred');
    });
  });

  describe('reload functionality', () => {
    it('should reload profile from server', async () => {
      const initialProfile = {
        userId: 'user_123',
        displayName: 'oldname',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedProfile = {
        ...initialProfile,
        displayName: 'newname',
        updatedAt: new Date('2024-01-02'),
      };

      mockGetProfile.mockResolvedValueOnce(initialProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile?.displayName).toBe('oldname');

      // Server has updated profile
      mockGetProfile.mockResolvedValueOnce(updatedProfile);

      await result.current.reload();

      await waitFor(() => {
        expect(result.current.profile?.displayName).toBe('newname');
      });

      expect(mockGetProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('create profile', () => {
    it('should create profile when none exists', async () => {
      const newProfile = {
        userId: 'user_123',
        displayName: 'newuser',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // No profile exists
      const error = new Error('Profile not found');
      (error as any).status = 404;
      mockGetProfile.mockRejectedValue(error);
      mockCreateProfile.mockResolvedValue(newProfile);

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.createProfile('newuser');

      expect(success).toBe(true);
      
      await waitFor(() => {
        expect(result.current.profile).toEqual(newProfile);
      });
      
      expect(mockCreateProfile).toHaveBeenCalledWith('newuser');
    });

    it('should handle create profile failure', async () => {
      const error = new Error('Profile not found');
      (error as any).status = 404;
      mockGetProfile.mockRejectedValue(error);
      mockCreateProfile.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const success = await result.current.createProfile('newuser');

      expect(success).toBe(false);
      
      await waitFor(() => {
        expect(result.current.error).toBe('Creation failed');
      });
    });
  });
});
