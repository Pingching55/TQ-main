# TradeQuest Testing Suite

## 🧪 **Complete Testing Framework**

This testing suite provides comprehensive coverage for the TradeQuest trading journal application, including unit tests, integration tests, and utility testing.

## 📁 **Test Structure**

```
tests/
├── __mocks__/           # Mock implementations and test data
├── unit/                # Unit tests for individual functions/components
├── integration/         # Integration tests for workflows
├── utils/               # Testing utilities and helpers
├── setup/               # Test configuration and setup
└── README.md           # This file
```

## 🚀 **Getting Started**

### **1. Install Dependencies**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest @vitest/ui jsdom msw
```

### **2. Run Tests**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test sentiment-analysis

# Run tests with coverage
npm run test:coverage
```

### **3. Add Test Scripts to package.json**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 📋 **Test Categories**

### **🔧 Unit Tests**

#### **Authentication Tests** (`unit/authentication.test.tsx`)
- ✅ Login form validation
- ✅ Registration flow
- ✅ Password confirmation
- ✅ Error handling
- ✅ Success redirects

#### **Trading Calculations** (`unit/trading-calculations.test.ts`)
- ✅ P&L calculations for Long/Short positions
- ✅ Win rate calculations
- ✅ Profit factor calculations
- ✅ Sharpe ratio calculations
- ✅ Edge cases and error handling

#### **Sentiment Analysis** (`unit/sentiment-analysis.test.ts`)
- ✅ VADER sentiment analysis
- ✅ Financial keyword boosting
- ✅ Sentiment formatting
- ✅ Icon generation
- ✅ Edge cases (empty text, special characters)

#### **Data Validation** (`unit/data-validation.test.ts`)
- ✅ Email validation
- ✅ Username validation
- ✅ Trading pair validation
- ✅ Price validation
- ✅ Phone number validation
- ✅ Input sanitization

#### **Theme Management** (`unit/theme-management.test.tsx`)
- ✅ Theme context functionality
- ✅ Theme persistence
- ✅ Theme switching
- ✅ Loading states
- ✅ Error boundaries

#### **Utility Functions** (`unit/utility-functions.test.ts`)
- ✅ Currency formatting
- ✅ Date formatting
- ✅ Percentage calculations
- ✅ Account balance calculations
- ✅ Data grouping functions

### **🔗 Integration Tests**

#### **Trade Workflow** (`integration/trade-workflow.test.tsx`)
- ✅ Complete trade creation flow
- ✅ Form validation
- ✅ Error handling
- ✅ State management
- ✅ Balance updates

#### **Dashboard Analytics** (`integration/dashboard-analytics.test.tsx`)
- ✅ Metrics calculations
- ✅ Real-time updates
- ✅ Chart data generation
- ✅ Performance indicators
- ✅ Edge cases

#### **Community Interaction** (`integration/community-interaction.test.tsx`)
- ✅ Channel navigation
- ✅ Post creation
- ✅ Comment functionality
- ✅ Image uploads
- ✅ User interactions

#### **Team Collaboration** (`integration/team-collaboration.test.tsx`)
- ✅ Team room functionality
- ✅ Real-time chat
- ✅ Message sending
- ✅ Connection status
- ✅ Error handling

## 🛠️ **How to Write Tests**

### **1. Unit Test Example**
```typescript
import { describe, it, expect } from 'vitest';
import { calculatePnL } from '@/lib/trading-utils';

describe('Trading Calculations', () => {
  it('should calculate Long position P&L correctly', () => {
    const pnl = calculatePnL('Long', 1.0850, 1.0900, 1);
    expect(pnl).toBe(0.0050);
  });
});
```

### **2. Component Test Example**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByText('Click me'));
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

### **3. Integration Test Example**
```typescript
import { renderWithProviders } from '../utils/test-helpers';

describe('Feature Integration', () => {
  it('should complete full workflow', async () => {
    renderWithProviders(<FeatureComponent />);
    
    // Test complete user workflow
    await user.type(screen.getByLabelText('Input'), 'test data');
    await user.click(screen.getByText('Submit'));
    
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });
});
```

## 🎯 **Testing Best Practices**

### **1. Test Structure (AAA Pattern)**
```typescript
it('should do something', () => {
  // Arrange - Set up test data
  const input = 'test data';
  
  // Act - Execute the function
  const result = myFunction(input);
  
  // Assert - Verify the result
  expect(result).toBe('expected output');
});
```

### **2. Mock External Dependencies**
```typescript
// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));
```

### **3. Test Edge Cases**
- Empty inputs
- Invalid data
- Network errors
- Boundary values
- Null/undefined values

### **4. Use Descriptive Test Names**
```typescript
// ✅ Good
it('should calculate profit for Long position when exit price is higher than entry price')

// ❌ Bad
it('should work')
```

## 📊 **Test Coverage Goals**

- **Functions**: 90%+ coverage
- **Components**: 80%+ coverage
- **Critical paths**: 100% coverage
- **Error scenarios**: Full coverage

## 🔍 **Running Specific Tests**

```bash
# Test specific module
npm test authentication

# Test specific function
npm test calculatePnL

# Test with pattern
npm test --grep "should validate"

# Test single file
npm test unit/sentiment-analysis.test.ts
```

## 🐛 **Debugging Tests**

### **1. Use Console Logs**
```typescript
it('should debug test', () => {
  console.log('Debug info:', testData);
  expect(result).toBe(expected);
});
```

### **2. Use screen.debug()**
```typescript
it('should debug component', () => {
  render(<Component />);
  screen.debug(); // Prints DOM to console
});
```

### **3. Use waitFor for Async**
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 5000 });
```

## ✅ **Test Checklist**

Before deploying, ensure:
- [ ] All tests pass
- [ ] Coverage meets requirements
- [ ] No console errors in tests
- [ ] Tests run in CI/CD pipeline
- [ ] Mock data is realistic
- [ ] Edge cases are covered
- [ ] Performance tests pass

## 🎓 **Learning Resources**

- **Vitest Documentation**: https://vitest.dev/
- **Testing Library**: https://testing-library.com/
- **Jest Matchers**: https://jestjs.io/docs/expect
- **React Testing**: https://testing-library.com/docs/react-testing-library/intro

This testing suite ensures your TradeQuest application is robust, reliable, and ready for production deployment!