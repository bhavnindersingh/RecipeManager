import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import '../styles/PinLogin.css';

const PinLogin = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const MAX_PIN_LENGTH = 4;

  useEffect(() => {
    // Check if already authenticated
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      redirectByRole(user.role);
    }
  }, []);

  const redirectByRole = (role) => {
    switch (role) {
      case 'admin':
        navigate('/manager');
        break;
      case 'server':
        navigate('/pos');
        break;
      case 'kitchen':
        navigate('/kds');
        break;
      case 'store_manager':
        navigate('/ingredients');
        break;
      default:
        navigate('/manager');
    }
  };

  const handleNumberClick = (number) => {
    if (pin.length < MAX_PIN_LENGTH) {
      setPin(pin + number);
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length !== MAX_PIN_LENGTH) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await authService.verifyPin(pin);

      if (user) {
        // Successful login - reload to sync state with App.js
        window.location.reload();
      } else {
        // Invalid PIN
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    } else if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      handleClear();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin]);

  return (
    <div className="pin-login-container">
      <div className="pin-login-card">
        <div className="pin-login-header">
          <h1 className="pin-login-title">Conscious Cafe</h1>
          <h2 className="pin-login-subtitle">Enter Your PIN</h2>
        </div>

        <div className="pin-display">
          {[...Array(MAX_PIN_LENGTH)].map((_, index) => (
            <div
              key={index}
              className={`pin-dot ${index < pin.length ? 'filled' : ''}`}
            >
              {index < pin.length ? '●' : '○'}
            </div>
          ))}
        </div>

        {error && <div className="pin-error-message">{error}</div>}

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-key"
              onClick={() => handleNumberClick(num.toString())}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button
            className="pin-key pin-key-clear"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
          <button
            className="pin-key"
            onClick={() => handleNumberClick('0')}
            disabled={loading}
          >
            0
          </button>
          <button
            className="pin-key pin-key-enter"
            onClick={handleSubmit}
            disabled={loading || pin.length !== MAX_PIN_LENGTH}
          >
            {loading ? '...' : 'Enter'}
          </button>
        </div>

        <div className="pin-help-text">
          <p>Default PINs:</p>
          <ul>
            <li>Admin: 0000</li>
            <li>Server: 1111</li>
            <li>Kitchen: 2222</li>
            <li>Store Manager: 3333</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PinLogin;
