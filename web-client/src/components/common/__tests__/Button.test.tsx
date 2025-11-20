import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with children text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    screen.getByRole('button').click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);

    screen.getByRole('button').click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render disabled state correctly', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should render loading state with loading text', () => {
    render(<Button loading>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading...');
  });

  it('should not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} loading>Click me</Button>);

    screen.getByRole('button').click();

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render primary variant by default', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('primary');
  });

  it('should render secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('secondary');
  });

  it('should render danger variant', () => {
    render(<Button variant="danger">Click me</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('danger');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Click me</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });

  it('should support button type attribute', () => {
    render(<Button type="submit">Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should default to button type', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should forward additional props to button element', () => {
    render(<Button aria-label="Custom label" data-testid="custom-button">Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('data-testid', 'custom-button');
  });

  it('should render with full width when fullWidth prop is true', () => {
    render(<Button fullWidth>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('fullWidth');
  });
});
