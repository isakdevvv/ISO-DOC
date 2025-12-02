import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Home', () => {
    it('renders a heading', () => {
        render(<h1>Hello World</h1>)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello World')
    })
})
