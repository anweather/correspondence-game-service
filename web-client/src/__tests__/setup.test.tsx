import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/test-utils'

describe('Test Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Test</div>
    render(<TestComponent />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
