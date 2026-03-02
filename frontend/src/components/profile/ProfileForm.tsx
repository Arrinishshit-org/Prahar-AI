import React, { useState } from 'react';

interface ProfileFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      age: '',
      income: '',
      state: '',
      gender: '',
      maritalStatus: '',
      employment: '',
      education: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      age: parseInt(formData.age),
      income: parseFloat(formData.income),
    });
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <h3>Personal Information</h3>
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
        <select
          value={formData.gender}
          onChange={e => setFormData({ ...formData, gender: e.target.value })}
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </section>

      <section className="form-section">
        <h3>Economic Information</h3>
        <input
          type="number"
          placeholder="Annual Income"
          value={formData.income}
          onChange={e => setFormData({ ...formData, income: e.target.value })}
        />
        <select
          value={formData.employment}
          onChange={e => setFormData({ ...formData, employment: e.target.value })}
        >
          <option value="">Employment Status</option>
          <option value="employed">Employed</option>
          <option value="self-employed">Self-Employed</option>
          <option value="unemployed">Unemployed</option>
          <option value="student">Student</option>
        </select>
      </section>

      <section className="form-section">
        <h3>Location</h3>
        <input
          type="text"
          placeholder="State"
          value={formData.state}
          onChange={e => setFormData({ ...formData, state: e.target.value })}
        />
      </section>

      <button type="submit">Save Profile</button>
    </form>
  );
};
