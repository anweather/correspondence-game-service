import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { 
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    ...options 
  })
}

export * from '@testing-library/react'
export { customRender as render }
