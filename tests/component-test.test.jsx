import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple test component
function SimpleButton({ onClick, children }) {
  return (
    <button onClick={onClick} data-testid="simple-button">
      {children}
    </button>
  );
}

function SimpleForm({ onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    onSubmit({
      name: formData.get('name'),
      amount: formData.get('amount'),
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="simple-form">
      <input name="name" placeholder="Enter name" required />
      <input name="amount" type="number" placeholder="Enter amount" required />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('Simple Component Tests', () => {
  it('should render button with text', () => {
    render(<SimpleButton>Click me</SimpleButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', () => {
    let clicked = false;
    const handleClick = () => { clicked = true; };
    
    render(<SimpleButton onClick={handleClick}>Click me</SimpleButton>);
    fireEvent.click(screen.getByTestId('simple-button'));
    
    expect(clicked).toBe(true);
  });

  it('should submit form with data', () => {
    let submittedData = null;
    const handleSubmit = (data) => { submittedData = data; };
    
    render(<SimpleForm onSubmit={handleSubmit} />);
    
    fireEvent.change(screen.getByPlaceholderText('Enter name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Enter amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Submit'));
    
    expect(submittedData).toEqual({
      name: 'Test User',
      amount: '100',
    });
  });
});