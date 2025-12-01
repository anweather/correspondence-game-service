import { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import { ProfileForm } from '../components/Profile/ProfileForm';
import { Button } from '../components/common/Button';
import styles from './ProfileView.module.css';

/**
 * Profile View - User profile and settings
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function ProfileView() {
  const { profile, loading, updating, error, updateProfile, createProfile, reload } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    turnNotifications: true,
    notificationDelay: 5, // minutes
  });
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notificationPreferences');
      if (saved) {
        setNotificationPreferences(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Error loading notification preferences:', err);
    }
  }, []);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSubmitProfile = async (displayName: string) => {
    const success = await updateProfile(displayName);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCreateProfile = async () => {
    await createProfile();
  };

  const handleToggleTurnNotifications = () => {
    setNotificationPreferences((prev) => ({
      ...prev,
      turnNotifications: !prev.turnNotifications,
    }));
    setPreferencesSaved(false);
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setNotificationPreferences((prev) => ({
        ...prev,
        notificationDelay: value,
      }));
      setPreferencesSaved(false);
    }
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences));
      setPreferencesSaved(true);
      // Clear success message after 3 seconds
      setTimeout(() => setPreferencesSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.profileView}>
        <div className={styles.header}>
          <h1>Profile</h1>
        </div>
        <div className={styles.loading}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <div className={styles.profileView}>
        <div className={styles.header}>
          <h1>Profile</h1>
        </div>
        <div className={styles.error} role="alert">
          <p>Failed to load profile: {error}</p>
          <button
            className={styles.retryButton}
            onClick={reload}
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // New user state - no profile yet
  if (!profile && !loading) {
    return (
      <div className={styles.profileView}>
        <div className={styles.header}>
          <h1>Profile</h1>
        </div>
        <div className={styles.newUserPrompt}>
          <h2>Create Your Profile</h2>
          <p>
            Welcome! Let's set up your profile. You'll get a default display name that you can
            customize later.
          </p>
          <button
            className={styles.createProfileButton}
            onClick={handleCreateProfile}
            disabled={updating}
          >
            {updating ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </div>
    );
  }

  // Main profile view
  return (
    <div className={styles.profileView}>
      <div className={styles.header}>
        <h1>Profile</h1>
      </div>

      <div className={styles.content}>
        {/* Profile Information Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Profile Information</h2>
            {!isEditing && (
              <button
                className={styles.editButton}
                onClick={handleEditClick}
                aria-label="Edit profile"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <ProfileForm
              initialDisplayName={profile?.displayName || ''}
              onSubmit={handleSubmitProfile}
              onCancel={handleCancelEdit}
              loading={updating}
              error={error}
            />
          ) : (
            <div className={styles.profileInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Display Name</span>
                <span className={styles.infoValue}>{profile?.displayName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>User ID</span>
                <span className={styles.infoValue}>{profile?.userId}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>
                  {profile?.createdAt && formatDate(profile.createdAt)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Last Updated</span>
                <span className={styles.infoValue}>
                  {profile?.updatedAt && formatDate(profile.updatedAt)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Notification Preferences Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Notification Preferences</h2>
          </div>

          <div className={styles.notificationPreferences}>
            <div className={styles.preferenceRow}>
              <label htmlFor="turnNotifications" className={styles.preferenceLabel}>
                <span className={styles.preferenceLabelText}>Turn Notifications</span>
                <span className={styles.preferenceDescription}>
                  Receive notifications when it's your turn to play
                </span>
              </label>
              <div className={styles.toggle}>
                <input
                  type="checkbox"
                  id="turnNotifications"
                  className={styles.toggleInput}
                  checked={notificationPreferences.turnNotifications}
                  onChange={handleToggleTurnNotifications}
                />
                <span className={styles.toggleSlider}></span>
              </div>
            </div>

            <div className={styles.preferenceRow}>
              <label htmlFor="notificationDelay" className={styles.preferenceLabel}>
                <span className={styles.preferenceLabelText}>Notification Delay</span>
                <span className={styles.preferenceDescription}>
                  Minutes to wait before sending a notification
                </span>
              </label>
              <input
                type="number"
                id="notificationDelay"
                className={styles.delayInput}
                value={notificationPreferences.notificationDelay}
                onChange={handleDelayChange}
                min="0"
                max="60"
                aria-label="Notification delay in minutes"
              />
            </div>

            <button
              className={styles.savePreferencesButton}
              onClick={handleSavePreferences}
            >
              Save Preferences
            </button>

            {preferencesSaved && (
              <div className={styles.successMessage}>
                Preferences saved successfully!
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
