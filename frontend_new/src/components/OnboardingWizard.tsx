import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, GraduationCap, Heart, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { updateProfile } from '../api';
import { useAuth } from '../AuthContext';

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const INTERESTS = [
  'Agriculture', 'Health', 'Education', 'Housing', 'Employment',
  'Women Welfare', 'Senior Citizens', 'Disability', 'Minority', 'Sports',
  'Entrepreneurship', 'Skill Development', 'Social Welfare', 'Finance',
];

const steps = [
  { id: 1, label: 'Personal', icon: User, title: 'Your Personal Details' },
  { id: 2, label: 'Work', icon: Briefcase, title: 'Work, Income & Land' },
  { id: 3, label: 'Education', icon: GraduationCap, title: 'Education & Category' },
  { id: 4, label: 'Interests', icon: Heart, title: 'Pick Your Interests' },
];

export default function OnboardingWizard({ onComplete, onSkip }: Props) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Personal
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [state, setState] = useState(user?.state || '');
  const [gender, setGender] = useState((user as any)?.gender || '');
  const [maritalStatus, setMaritalStatus] = useState((user as any)?.maritalStatus || '');
  const [familySize, setFamilySize] = useState((user as any)?.familySize?.toString() || '');
  const [residenceType, setResidenceType] = useState((user as any)?.residenceType || '');

  // Step 2 — Work & Income
  const [employment, setEmployment] = useState(user?.employment || '');
  const [occupation, setOccupation] = useState((user as any)?.occupation || '');
  const [income, setIncome] = useState(user?.income?.toString() || '');
  const [povertyStatus, setPovertyStatus] = useState((user as any)?.povertyStatus || '');
  const [rationCard, setRationCard] = useState((user as any)?.rationCard || '');
  const [landOwnership, setLandOwnership] = useState((user as any)?.landOwnership || '');

  // Step 3 — Education & Category
  const [education, setEducation] = useState(user?.education || '');
  const [socialCategory, setSocialCategory] = useState((user as any)?.socialCategory || '');
  const [district, setDistrict] = useState((user as any)?.district || '');
  const [hasDisability, setHasDisability] = useState(!!(user as any)?.disability);
  const [disabilityType, setDisabilityType] = useState((user as any)?.disabilityType || '');
  const [isMinority, setIsMinority] = useState(!!(user as any)?.minority);
  const [minorityCommunity, setMinorityCommunity] = useState((user as any)?.minorityCommunity || '');

  // Step 4 — Interests
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const saveAndNext = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (step === 1) {
        if (name) payload.name = name;
        if (age) payload.age = Number(age);
        if (state) payload.state = state;
        if (gender) payload.gender = gender;
        if (maritalStatus) payload.maritalStatus = maritalStatus;
        if (familySize) payload.familySize = Number(familySize);
        if (residenceType) payload.residenceType = residenceType;
      } else if (step === 2) {
        if (employment) payload.employment = employment;
        if (occupation) payload.occupation = occupation;
        if (income) payload.income = Number(income);
        if (povertyStatus) payload.povertyStatus = povertyStatus;
        if (rationCard) payload.rationCard = rationCard;
        if (landOwnership) payload.landOwnership = landOwnership;
      } else if (step === 3) {
        if (education) payload.education = education;
        if (socialCategory) payload.socialCategory = socialCategory;
        if (district) payload.district = district;
        payload.disability = hasDisability;
        if (hasDisability && disabilityType) payload.disabilityType = disabilityType;
        payload.minority = isMinority;
        if (isMinority && minorityCommunity) payload.minorityCommunity = minorityCommunity;
      } else if (step === 4) {
        if (interests.length > 0) payload.interests = interests.join(',');
        payload.onboardingComplete = true;
      }
      if (Object.keys(payload).length > 0) {
        await updateProfile(user.userId, payload);
      }
    } catch (e) {
      console.error('Failed to save step', e);
    } finally {
      setSaving(false);
    }

    if (step < 4) {
      setStep(s => s + 1);
    } else {
      await refreshProfile();
      onComplete();
    }
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return employment.length > 0;
    if (step === 3) return education.length > 0;
    if (step === 4) return true; // interests optional
    return true;
  };

  /* ── Chip selector helper ── */
  const ChipGroup = ({
    options,
    value,
    onChange,
    columns = 2,
  }: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
    columns?: number;
  }) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            value === opt
              ? 'bg-accent text-white border-accent'
              : 'border-border text-muted hover:border-accent/50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="bg-parchment w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border border-border"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="bg-primary p-6 text-white relative">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="size-4" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Step {step} of 4</p>
          <h2 className="text-xl font-bold">{steps[step - 1].title}</h2>
          <p className="text-sm text-white/70 mt-1">
            Complete your profile to get personalized scheme recommendations
          </p>

          {/* Progress bar */}
          <div className="mt-4 flex gap-1.5">
            {steps.map(s => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  s.id <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* ── Step 1: Personal ── */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">Full Name *</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="input-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-1.5">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        min="5" max="120"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-1.5">Gender</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="input-base"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">State / UT</label>
                    <select
                      value={state}
                      onChange={e => setState(e.target.value)}
                      className="input-base"
                    >
                      <option value="">Select state</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Marital Status</label>
                    <ChipGroup
                      options={['Single', 'Married', 'Divorced', 'Widowed']}
                      value={maritalStatus}
                      onChange={setMaritalStatus}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-1.5">Family Size</label>
                      <input
                        type="number"
                        value={familySize}
                        onChange={e => setFamilySize(e.target.value)}
                        placeholder="e.g. 4"
                        min="1" max="20"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-1.5">Residence</label>
                      <select
                        value={residenceType}
                        onChange={e => setResidenceType(e.target.value)}
                        className="input-base"
                      >
                        <option value="">Select</option>
                        <option value="Rural">Rural</option>
                        <option value="Urban">Urban</option>
                        <option value="Semi-urban">Semi-urban</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ── Step 2: Work, Income & Land ── */}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Employment Status *</label>
                    <ChipGroup
                      options={['Salaried', 'Self-Employed', 'Unemployed', 'Student', 'Farmer', 'Retired']}
                      value={employment}
                      onChange={setEmployment}
                      columns={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">Specific Occupation</label>
                    <input
                      value={occupation}
                      onChange={e => setOccupation(e.target.value)}
                      placeholder="e.g. Construction Worker, Artisan, Teacher"
                      className="input-base"
                    />
                    <p className="text-xs text-muted mt-1">Helps match occupation-specific schemes</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">Annual Income (₹)</label>
                    <input
                      type="number"
                      value={income}
                      onChange={e => setIncome(e.target.value)}
                      placeholder="e.g. 350000"
                      className="input-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">Poverty Status</label>
                      <ChipGroup
                        options={['BPL', 'APL', 'Not Sure']}
                        value={povertyStatus}
                        onChange={setPovertyStatus}
                        columns={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">Ration Card</label>
                      <ChipGroup
                        options={['AAY', 'BPL', 'APL', 'None']}
                        value={rationCard}
                        onChange={setRationCard}
                        columns={1}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Land Ownership</label>
                    <ChipGroup
                      options={['Landless', 'Marginal (< 1 ha)', 'Small (1-2 ha)', 'Large (> 2 ha)', 'N/A']}
                      value={landOwnership}
                      onChange={setLandOwnership}
                      columns={3}
                    />
                  </div>
                </>
              )}

              {/* ── Step 3: Education & Category ── */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Education Level *</label>
                    <ChipGroup
                      options={['Below 10th', '10th / SSC', '12th / HSC', 'Diploma', 'Graduate', 'Post-Graduate']}
                      value={education}
                      onChange={setEducation}
                      columns={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">District</label>
                    <input
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      placeholder="e.g. Lucknow, Pune, Jaipur"
                      className="input-base"
                    />
                    <p className="text-xs text-muted mt-1">Some schemes are district-specific</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-2">Social Category</label>
                    <ChipGroup
                      options={['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority']}
                      value={socialCategory}
                      onChange={setSocialCategory}
                      columns={3}
                    />
                  </div>
                  {/* Disability */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasDisability}
                        onChange={e => {
                          setHasDisability(e.target.checked);
                          if (!e.target.checked) setDisabilityType('');
                        }}
                        className="size-4 rounded accent-accent"
                      />
                      <span className="text-sm font-semibold text-ink">Person with Disability</span>
                    </label>
                    {hasDisability && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <ChipGroup
                          options={['Visual', 'Hearing', 'Locomotor', 'Intellectual', 'Multiple', 'Other']}
                          value={disabilityType}
                          onChange={setDisabilityType}
                          columns={3}
                        />
                      </motion.div>
                    )}
                  </div>
                  {/* Minority */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMinority}
                        onChange={e => {
                          setIsMinority(e.target.checked);
                          if (!e.target.checked) setMinorityCommunity('');
                        }}
                        className="size-4 rounded accent-accent"
                      />
                      <span className="text-sm font-semibold text-ink">Minority Community</span>
                    </label>
                    {isMinority && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <ChipGroup
                          options={['Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi']}
                          value={minorityCommunity}
                          onChange={setMinorityCommunity}
                          columns={3}
                        />
                      </motion.div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 4: Interests ── */}
              {step === 4 && (
                <>
                  <p className="text-sm text-muted">Select areas you are interested in (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          interests.includes(interest)
                            ? 'bg-accent text-white border-accent'
                            : 'border-border text-muted hover:border-accent/50'
                        }`}
                      >
                        {interests.includes(interest) && <Check className="size-3 inline mr-1" />}
                        {interest}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 flex items-center justify-between gap-3">
          <button
            onClick={step === 1 ? onSkip : () => setStep(s => s - 1)}
            className="btn-ghost text-sm"
          >
            {step === 1 ? (
              'Skip for now'
            ) : (
              <><ChevronLeft className="size-4" /> Back</>
            )}
          </button>

          <button
            onClick={saveAndNext}
            disabled={!canProceed() || saving}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {saving ? (
              <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : step === 4 ? (
              <><Check className="size-4" /> Complete Setup</>
            ) : (
              <>Next <ChevronRight className="size-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
