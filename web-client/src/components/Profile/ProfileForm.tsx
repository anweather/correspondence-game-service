import { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import styles from './ProfileForm.module.css';

export interface ProfileFormProps {
  initialDisplayName: string;
  onSubmit: (displayName: string) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

interface ValidationError {
  message: string;
}

/**
 * Validates display name according to requirements:
 * - Length: 3-50 characters
 * - Characters: alphanumeric and underscore only
 */
function validateDisplayName(displayName: string): ValidationError | null {
  if (!displayName || displayName.trim() === '') {
    return { message: 'Display name is required' };
  }

  if (displayName.length < 3) {
    return { message: 'Display name must be at least 3 characters' };
  }

  if (displayName.length > 50) {
    return { message: 'Display name must be no more than 50 characters' };
  }

  // Only alphanumeric and underscore allowed
  if (!/^[a-zA-Z0-9_]+$/.test(displayName)) {
    return { message: 'Display name can only contain alphanumeric characters and underscore' };
  }

  return null;
}

export function ProfileForm({
  initialDisplayName,
  onSubmit,
  onCancel,
  loading = false,
  error = null,
}: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [touched, setTouched] = useState(false);

  // Reset display name when initial value changes
  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayName(newValue);
    
    // Always validate to keep button state correct
    setValidationError(validateDisplayName(newValue));
  };

  const handleBlur = () => {
    setTouched(true);
    setValidationError(validateDisplayName(displayName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate before submit
    const error = validateDisplayName(displayName);
    if (error) {
      setValidationError(error);
      setTouched(true);
      return;
    }

    onSubmit(displayName);
  };

  const isChanged = displayName !== initialDisplayName;
  const hasValidationError = validationError !== null;
  const isSubmitDisabled = !isChanged || hasValidationError || loading;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="displayName" className={styles.label}>
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          className={styles.input}
          value={displayName}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={loading}
          placeholder="Enter your display name"
        />
        {touched && validationError && (
          <p className={styles.errorText}>{validationError.message}</p>
        )}
        {error && (
          <p className={styles.errorText}>{error}</p>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitDisabled}
          loading={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
