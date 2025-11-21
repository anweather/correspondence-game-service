import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App', () => {
  it('should render without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('should render AdminView when navigating to /admin', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>
    );

    // AdminView should have a heading with "Admin View"
    expect(screen.getByRole('heading', { name: /admin view/i })).toBeInTheDocument();
  });

  it('should render PlayerView when navigating to /player', () => {
    render(
      <MemoryRouter initialEntries={['/player']}>
        <App />
      </MemoryRouter>
    );

    // PlayerView should have player-related content
    // Check for the main "Player View" heading
    expect(screen.getByRole('heading', { name: /^player view$/i })).toBeInTheDocument();
  });

  it('should render PlayerView by default at root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Default route should show PlayerView
    expect(screen.getByRole('heading', { name: /^player view$/i })).toBeInTheDocument();
  });

  it('should wrap routes with AdminProvider for admin view', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>
    );

    // AdminProvider should be present - verify by checking AdminView renders
    expect(screen.getByRole('heading', { name: /admin view/i })).toBeInTheDocument();
  });

  it('should wrap routes with PlayerProvider for player view', () => {
    render(
      <MemoryRouter initialEntries={['/player']}>
        <App />
      </MemoryRouter>
    );

    // PlayerProvider should be present - verify by checking PlayerView renders
    expect(screen.getByRole('heading', { name: /^player view$/i })).toBeInTheDocument();
  });
});
