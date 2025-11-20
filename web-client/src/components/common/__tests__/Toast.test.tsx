import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Toast } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render toast with message', () => {
    render(
      <Toast message="Test message" onClose={vi.fn()} />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success variant by default', () => {
    render(
      <Toast message="Success message" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('success');
  });

  it('should render error variant', () => {
    render(
      <Toast message="Error message" variant="error" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('error');
  });

  it('should render warning variant', () => {
    render(
      <Toast message="Warning message" variant="warning" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('warning');
  });

  it('should render info variant', () => {
    render(
      <Toast message="Info message" variant="info" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('info');
  });

  it('should call onClose when close button is clicked', () => {
    vi.useRealTimers();
    const handleClose = vi.fn();

    render(
      <Toast message="Test message" onClose={handleClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();

    expect(handleClose).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
  });

  it('should auto-dismiss after default duration (5000ms)', () => {
    const handleClose = vi.fn();

    render(
      <Toast message="Test message" onClose={handleClose} />
    );

    expect(handleClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after custom duration', () => {
    const handleClose = vi.fn();

    render(
      <Toast message="Test message" onClose={handleClose} duration={3000} />
    );

    expect(handleClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss when duration is null', () => {
    const handleClose = vi.fn();

    render(
      <Toast message="Test message" onClose={handleClose} duration={null} />
    );

    vi.advanceTimersByTime(10000);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should allow manual dismissal before auto-dismiss', () => {
    const handleClose = vi.fn();

    render(
      <Toast message="Test message" onClose={handleClose} duration={5000} />
    );

    // Manually dismiss before timeout
    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout on unmount', () => {
    const handleClose = vi.fn();

    const { unmount } = render(
      <Toast message="Test message" onClose={handleClose} duration={5000} />
    );

    unmount();

    vi.advanceTimersByTime(5000);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <Toast message="Test message" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('should render with animation classes', () => {
    render(
      <Toast message="Test message" onClose={vi.fn()} />
    );

    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('toast');
  });
});
