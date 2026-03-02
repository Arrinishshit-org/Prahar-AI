import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    income: '',
    state: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      await register({
        ...formData,
        age: parseInt(formData.age),
        income: parseFloat(formData.income),
      });
      // Redirect handled by auth hook
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="register-page">
      <h1>Register</h1>
      {isProcessing && <p>Processing your registration...</p>}
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={e => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Age"
          value={formData.age}
          onChange={e => setFormData({ ...formData, age: e.target.value })}
        />
        <input
          type="number"
          placeholder="Income"
          value={formData.income}
          onChange={e => setFormData({ ...formData, income: e.target.value })}
        />
        <input
          type="text"
          placeholder="State"
          value={formData.state}
          onChange={e => setFormData({ ...formData, state: e.target.value })}
        />
        <button type="submit" disabled={isProcessing}>
          Register
        </button>
      </form>
    </div>
  );
};
