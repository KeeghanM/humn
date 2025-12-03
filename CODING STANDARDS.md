# 🧠 CODING STANDARDS

This document outlines the coding standards and best practices for our project. Adhering to these guidelines ensures consistency, readability, maintainability, and high quality across our codebase.

## 🚀 General Principles

### 💬 Comments

- Explain the _why_, not the _what_. The code itself should describe what it's doing.
- Use comments sparingly to break up long blocks of code into logical sections using headers (e.g., `// --- Form validation ---`).
- Avoid over-commenting; prioritize writing self-descriptive code.

### 📏 Component Size & DRY Principles

- **Apply the DRY-3 rule**: Refactor code into a reusable function or component once it needs writing for the third time.
- Keep files under 300 lines as a general rule of thumb.
  - If a files exceeds the size limit, break it down into smaller sub-files or extract logic into custom hooks.

### 🛡️ Guard Clauses & Validation

- Prefer early returns to reduce nesting and improve readability. This applies to both conditional rendering in components and error handling in functions.
- For input validation, use Zod as high up the function call stack as possible.
- Validate inputs immediately and use a guard clause to handle invalid data.

### 🎁 Destructuring

- Always use destructuring for objects and arrays to make the code cleaner.
- Destructure objects and arrays directly in function parameters.
- Only make exceptions when there's a strong, justifiable reason, and document it with a comment.

### 🏗️ Code Structure

- No nested `if/else` statements - use early returns, guard clauses, or composition.
- Avoid deep nesting in general (max 2 levels).
- Keep functions small and focused on a single responsibility.
- Prefer flat, readable code over clever abstractions.

## 📛 Naming Conventions

- **Files**: `kebab-case` (e.g., `user-profile.tsx`, `payment-processor.ts`)
- **Variables/Functions**: `camelCase`, verb-based for functions (e.g., `getUserProfile`, `calculateTotal`, `validatePayment`)
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants (e.g., `API_BASE_URL`), `camelCase` for configuration.
- **Types**: `PascalCase` (e.g., `PaymentRequest`, `UserProfile`)
- **Test files**: `*.test.ts` or `*.spec.ts`

## ⚛️ Component Structure (React)

- **Imports**:
  - External imports first, alphabetized.
  - Internal imports next, alphabetized and grouped by type (`@utils` etc.).
- **Export**: Use `export function` with a descriptive name without `default`

## 🧪 Testing Principles

- Behaviour-Driven Testing
- No "unit tests" - this term is not helpful. Tests should verify expected Behaviour, treating - implementation as a black box.
- Test through the public API exclusively - internals should be invisible to tests.
- No 1:1 mapping between test files and implementation files.
- Tests that examine internal implementation details are wasteful and should be avoided.
- Coverage targets: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business Behaviour, not implementation details.
- Tests must document expected business Behaviour.

### Test Organization

```json
src/
  features/
    payment/
      payment-processor.ts
      payment-validator.ts
      payment-processor.test.ts // The validator is an implementation detail. Validation is fully covered, but by testing the expected business behaviour, treating the validation code itself as an implementation detail
```

### Test Data Pattern

Use factory functions with optional overrides for test data:

```javascript
/**
 * @typedef {import('./schemas/payment.schema').PostPaymentsRequestV3} PostPaymentsRequestV3
 * @typedef {import('./schemas/payment.schema').AddressDetails} AddressDetails
 */

/**
 * @param {Partial<PostPaymentsRequestV3>} [overrides]
 * @returns {PostPaymentsRequestV3}
 */
const getMockPaymentPostPaymentRequest = (overrides) => {
  return {
    CardAccountId: '1234567890123456',
    Amount: 100,
    Source: 'Web',
    AccountStatus: 'Normal',
    LastName: 'Doe',
    DateOfBirth: '1980-01-01',
    PayingCardDetails: {
      Cvv: '123',
      Token: 'token',
    },
    AddressDetails: getMockAddressDetails(),
    Brand: 'Visa',
    ...overrides,
  }
}

/**
 * @param {Partial<AddressDetails>} [overrides]
 * @returns {AddressDetails}
 */
const getMockAddressDetails = (overrides) => {
  return {
    HouseNumber: '123',
    HouseName: 'Test House',
    AddressLine1: 'Test Address Line 1',
    AddressLine2: 'Test Address Line 2',
    City: 'Test City',
    ...overrides,
  }
}
```

### Key Principles for Test Data Patterns

Key principles:

- Always return complete objects with sensible defaults.
- Accept optional `Partial<T>` overrides.
- Build incrementally - extract nested object factories as needed.
- Compose factories for complex objects.
- Consider using a test data builder pattern for very complex objects.

### Validating Test Data

When schemas exist, validate factory output to catch test data issues early:

```javascript
import { PaymentSchema } from '../schemas/payment.schema.js'

/**
 * @typedef {import('../schemas/payment.schema').Payment} Payment
 */

/**
 * @param {Partial<Payment>} [overrides]
 * @returns {Payment}
 */
const getMockPayment = (overrides) => {
  const basePayment = {
    amount: 100,
    currency: 'GBP',
    cardId: 'card_123',
    customerId: 'cust_456',
  }

  const paymentData = { ...basePayment, ...overrides }

  // Validate against real schema to catch type mismatches
  return PaymentSchema.parse(paymentData)
}

// This catches errors in test setup:
const payment = getMockPayment({
  amount: -100, // ❌ Schema validation fails: amount must be positive
})
```

### Why Validate Test Data

- Ensures test factories produce valid data that matches production schemas.
- Catches test data bugs immediately rather than in test assertions.
- Documents constraints (e.g., "amount must be positive") in schema, not in every test.
- Prevents tests from passing with invalid data that would fail in production.

### Anti-Patterns in Tests

Avoid these test smells:

```javascript
// ❌ BAD - Implementation-focused test
it('should call validateAmount', () => {
  const spy = jest.spyOn(validator, 'validateAmount')
  processPayment(payment)
  expect(spy).toHaveBeenCalled()
})

// ✅ GOOD - behaviour-focused test
it('should reject payments with negative amounts', () => {
  const payment = getMockPayment({ amount: -100 })
  const result = processPayment(payment)
  expect(result.success).toBe(false)
  expect(result.error.message).toBe('Invalid amount')
})

// ❌ BAD - Using let and beforeEach (shared mutable state)
let payment
beforeEach(() => {
  payment = { amount: 100 }
})
it('should process payment', () => {
  processPayment(payment)
})

// ✅ GOOD - Factory functions (isolated, immutable)
it('should process payment', () => {
  const payment = getMockPayment({ amount: 100 })
  processPayment(payment)
})
```

### Achieving 100% Coverage Through Business Behaviour

Example showing how validation code gets 100% coverage without testing it directly:

```javascript
// payment-validator.js (implementation detail)
/** @param {number} amount */
export const validatePaymentAmount = (amount) => {
  return amount > 0 && amount <= 10000
}

/** @param {PayingCardDetails} card */
export const validateCardDetails = (card) => {
  return /^\d{3,4}$/.test(card.cvv) && card.token.length > 0
}

// payment-processor.js (public API)
/**
 * @param {PaymentRequest} request
 * @returns {Result<Payment, PaymentError>}
 */
export const processPayment = (request) => {
  // Validation is used internally but not exposed
  if (!validatePaymentAmount(request.amount)) {
    return { success: false, error: new PaymentError('Invalid amount') }
  }

  if (!validateCardDetails(request.payingCardDetails)) {
    return { success: false, error: new PaymentError('Invalid card details') }
  }

  // Process payment...
  return { success: true, data: executedPayment }
}

// payment-processor.test.js
describe('Payment processing', () => {
  // These tests achieve 100% coverage of validation code
  // without directly testing the validator functions

  it('should reject payments with negative amounts', () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: -100 })
    const result = processPayment(payment)

    expect(result.success).toBe(false)
    expect(result.error.message).toBe('Invalid amount')
  })

  it('should reject payments exceeding maximum amount', () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: 10001 })
    const result = processPayment(payment)

    expect(result.success).toBe(false)
    expect(result.error.message).toBe('Invalid amount')
  })

  it('should reject payments with invalid CVV format', () => {
    const payment = getMockPaymentPostPaymentRequest({
      payingCardDetails: { cvv: '12', token: 'valid-token' },
    })
    const result = processPayment(payment)

    expect(result.success).toBe(false)
    expect(result.error.message).toBe('Invalid card details')
  })

  it('should process valid payments successfully', () => {
    const payment = getMockPaymentPostPaymentRequest({
      amount: 100,
      payingCardDetails: { cvv: '123', token: 'valid-token' },
    })
    const result = processPayment(payment)

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('completed')
  })
})
```

### React Component Testing

```javascript
// Good - testing user-visible behaviour
describe('PaymentForm', () => {
  it('should show error when submitting invalid amount', async () => {
    render(<PaymentForm />)

    const amountInput = screen.getByLabelText('Amount')
    const submitButton = screen.getByRole('button', { name: 'Submit Payment' })

    await userEvent.type(amountInput, '-100')
    await userEvent.click(submitButton)

    expect(screen.getByText('Amount must be positive')).toBeInTheDocument()
  })
})
```

## 💡 Example Patterns

### Error Handling

Use Result types or early returns:

```javascript
// Good - Result type pattern
/**
 * @template T
 * @template {Error} [E=Error]
 * @typedef {({success: true, data: T} | {success: false, error: E})} Result
 */

/**
 * @param {Payment} payment
 * @returns {Result<ProcessedPayment, PaymentError>}
 */
const processPayment = (payment) => {
  if (!isValidPayment(payment)) {
    return { success: false, error: new PaymentError('Invalid payment') }
  }

  if (!hasSufficientFunds(payment)) {
    return { success: false, error: new PaymentError('Insufficient funds') }
  }

  return { success: true, data: executePayment(payment) }
}

// Also good - early returns with exceptions
/**
 * @param {Payment} payment
 * @returns {ProcessedPayment}
 */
const processPayment = (payment) => {
  if (!isValidPayment(payment)) {
    throw new PaymentError('Invalid payment')
  }

  if (!hasSufficientFunds(payment)) {
    throw new PaymentError('Insufficient funds')
  }

  return executePayment(payment)
}
```

### Testing behaviour

```javascript
// Good - tests behaviour through public API
describe('PaymentProcessor', () => {
  it('should decline payment when insufficient funds', () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 1000 })
    const account = getMockAccount({ Balance: 500 })

    const result = processPayment(payment, account)

    expect(result.success).toBe(false)
    expect(result.error.message).toBe('Insufficient funds')
  })

  it('should process valid payment successfully', () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 100 })
    const account = getMockAccount({ Balance: 500 })

    const result = processPayment(payment, account)

    expect(result.success).toBe(true)
    expect(result.data.remainingBalance).toBe(400)
  })
})

// Avoid - testing implementation details
describe('PaymentProcessor', () => {
  it('should call checkBalance method', () => {
    // This tests implementation, not behaviour
  })
})
```

## 🚫 Common Patterns to Avoid (Anti-Patterns)

```javascript
// Avoid: Mutation
/**
 * @param {Item[]} items
 * @param {Item} newItem
 */
const addItem = (items, newItem) => {
  items.push(newItem) // Mutates array
  return items
}

// Prefer: Immutable update
/**
 * @param {Item[]} items
 * @param {Item} newItem
 * @returns {Item[]}
 */
const addItem = (items, newItem) => {
  return [...items, newItem]
}

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Prefer: Early returns
if (!user || !user.isActive || !user.hasPermission) {
  return
}
// do something

// Avoid: Large functions
/** @param {Order} order */
const processOrder = (order) => {
  // 100+ lines of code
}

// Prefer: Composed small functions
/** @param {Order} order */
const processOrder = (order) => {
  const validatedOrder = validateOrder(order)
  const pricedOrder = calculatePricing(validatedOrder)
  const finalOrder = applyDiscounts(pricedOrder)
  return submitOrder(finalOrder)
}
```

## 📝 Documentation Philosophy

We believe that good documentation starts with well-written code. Documentation should complement the code, not replace it.

If your code is clean, well-structured, and follows best practices, it will be easier to understand and maintain. Documentation should complement the code, not replace it.

We write documentation not for ourselves or our current team, but for future developers who weren't there when we first wrote this code. Documentation is a living document that should be updated as the code changes.
