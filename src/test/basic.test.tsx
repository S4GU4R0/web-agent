import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Basic Setup Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2)
  })

  it('should render a dummy component', () => {
    render(<div>Hello Web-Agent</div>)
    expect(screen.getByText('Hello Web-Agent')).toBeInTheDocument()
  })
})
