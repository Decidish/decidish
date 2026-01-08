import { useState } from 'react';

interface QuestionnaireData {
  dietType: string[];
  servings: number;
  budget: string;
  allergies: string[];
  cookingTime: string;
  skillLevel: string;
}

export default function Questionnaire() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<QuestionnaireData>({
    dietType: [],
    servings: 2,
    budget: '',
    allergies: [],
    cookingTime: '',
    skillLevel: ''
  });

  const dietOptions = ['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'No Restrictions'];
  const allergyOptions = ['Nuts', 'Shellfish', 'Eggs', 'Soy', 'Dairy', 'Gluten', 'Fish', 'None'];
  const budgetOptions = ['Budget-Friendly ($)', 'Moderate ($$)', 'Premium ($$$)'];
  const timeOptions = ['Under 30 min', '30-60 min', '1-2 hours', 'Over 2 hours'];
  const skillOptions = ['Beginner', 'Intermediate', 'Advanced'];

  const totalSteps = 5;

  const handleDietToggle = (diet: string) => {
    setFormData(prev => ({
      ...prev,
      dietType: prev.dietType.includes(diet)
        ? prev.dietType.filter(d => d !== diet)
        : [...prev.dietType, diet]
    }));
  };

  const handleAllergyToggle = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      window.REACT_APP_NAVIGATE('/market-selection');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <img 
            src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png" 
            alt="Recipe Recommender Logo" 
            className="h-16 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Tell Us About Your Preferences</h1>
          <p className="text-sm text-gray-600 text-center">Help us personalize your recipe recommendations</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Step {step} of {totalSteps}</span>
              <span className="text-sm text-gray-600">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); }}>
            {/* Step 1: Dietary Preferences */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What are your dietary preferences?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo'].map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setFormData({ ...formData, diet })}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        formData.diet === diet
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <span className="font-medium">{diet}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Servings */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">How many servings do you need?</h2>
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, servings: Math.max(1, formData.servings - 1) })}
                    className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <i className="ri-subtract-line text-xl"></i>
                  </button>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{formData.servings}</div>
                    <div className="text-sm text-gray-600 mt-2">servings</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, servings: formData.servings + 1 })}
                    className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <i className="ri-add-line text-xl"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Budget */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What's your budget per meal?</h2>
                <div className="space-y-3">
                  {[
                    { value: 'low', label: 'Budget-Friendly', desc: 'Under $10 per meal', icon: 'ri-coin-line' },
                    { value: 'medium', label: 'Moderate', desc: '$10 - $20 per meal', icon: 'ri-coins-line' },
                    { value: 'high', label: 'Premium', desc: 'Over $20 per meal', icon: 'ri-money-dollar-circle-line' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, budget: option.value })}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                        formData.budget === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.budget === option.value ? 'bg-indigo-100' : 'bg-gray-100'
                        }`}>
                          <i className={`${option.icon} text-xl ${
                            formData.budget === option.value ? 'text-indigo-600' : 'text-gray-600'
                          }`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.desc}</div>
                        </div>
                        {formData.budget === option.value && (
                          <i className="ri-check-line text-xl text-indigo-600"></i>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Allergies */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Any food allergies or restrictions?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'None'].map((allergy) => (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => {
                        const newAllergies = formData.allergies.includes(allergy)
                          ? formData.allergies.filter(a => a !== allergy)
                          : [...formData.allergies, allergy];
                        setFormData({ ...formData, allergies: newAllergies });
                      }}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        formData.allergies.includes(allergy)
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }`}
                    >
                      <span className="font-medium">{allergy}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Cooking Time & Skill */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">How much time can you spend cooking?</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {['15-30 min', '30-45 min', '45+ min'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setFormData({ ...formData, cookingTime: time })}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          formData.cookingTime === time
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <span className="font-medium text-sm">{time}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What's your cooking skill level?</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {['Beginner', 'Intermediate', 'Advanced'].map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => setFormData({ ...formData, skillLevel: skill })}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          formData.skillLevel === skill
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <span className="font-medium text-sm">{skill}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Previous
                </button>
              )}
              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-lg cursor-pointer whitespace-nowrap"
                >
                  Continue
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
