import { css } from '../src'

export const todoStyles = css`
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 400px;
  margin: 40px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 20px;
  }

  .input-group {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  button {
    padding: 10px 20px;
    cursor: pointer;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    transition: background 0.2s;
  }
  button:hover {
    background: #0056b3;
  }

  .card {
    background: #f8f9fa;
    padding: 15px;
    margin-top: 10px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  .card:hover {
    border-color: #007bff;
    background: #fff;
  }

  .card.done {
    text-decoration: line-through;
    opacity: 0.5;
    background: #eee;
  }

  .error {
    color: #dc3545;
    font-size: 0.9em;
    margin-bottom: 10px;
  }

  .loading {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 10px;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.6;
    }
  }

  /* Add a secondary button style */
  button.secondary {
    background: #6c757d;
    margin-left: 5px;
  }
  button.secondary:hover {
    background: #5a6268;
  }
`
