# Contributing Guidelines

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards
   - Write tests for new functionality
   - Update documentation as needed

3. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   npm run format
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference issue numbers when applicable
   ```bash
   git commit -m "feat: add user authentication service"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer functional programming patterns

### Python
- Follow PEP 8 style guide
- Use type hints for function signatures
- Write docstrings for all functions and classes
- Use Black for code formatting
- Use flake8 for linting

## Testing Guidelines

### Unit Tests
- Write unit tests for all new functions and classes
- Aim for >70% code coverage
- Use descriptive test names
- Test edge cases and error conditions

### Property-Based Tests
- Use fast-check (TypeScript) or Hypothesis (Python)
- Test universal properties that should hold for all inputs
- Document which requirements each property validates

### Integration Tests
- Test interactions between components
- Use test databases and mock external APIs
- Clean up test data after each test

## Git Hooks

Pre-commit hooks are configured to:
- Run linting on staged files
- Format code automatically
- Prevent commits with linting errors

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers
4. Address review feedback
5. Squash commits if requested
6. Merge after approval

## Questions?

Open an issue or reach out to the maintainers.
