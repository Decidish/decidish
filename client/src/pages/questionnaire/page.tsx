import { all } from 'axios';
import { useState } from 'react';
import { userApi } from '@/api/questionnaire/userApi';
import { UserPreferences } from '@/api/questionnaire/userApi';

interface Preferences {
  low_sugar: number;
  low_carb: number;
  high_carb: number;
  high_protein: number;
  low_fat: number;
  cholesterol_low: number;
  high_fiber: number;
  healthy_fats: number;
  gluten_free: number;
  lactose_free: number;
  vegan: number;
  vegetarian: number;
  paleo: number;
  keto: number;
  histamine_low: number;
  pregnancy_safe: number;
  light_diet: number;
  weight_loss: number;
  muscle_gain: number;
  endurance_training: number;
  marathon_training: number;
  quick_after_work: number;
  office_lunch: number;
  camping: number;
  party_food: number;
  picnic: number;
  seasonal_preferences: number;
  air_fryer: number;
  grill: number;
  frying: number;
  steaming: number;
  fermenting: number;
  oven_cooking: number;
  pressure_cooker: number;
  thermomix_user: number;
}

export default function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading,setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    low_sugar: 0.0,
    low_carb: 0.0,
    high_carb: 0.0,
    high_protein: 0.0,
    low_fat: 0.0,
    cholesterol_low: 0.0,
    high_fiber: 0.0,
    healthy_fats: 0.0,
    gluten_free: 0.0,
    lactose_free: 0.0,
    vegan: 0.0,
    vegetarian: 0.0,
    paleo: 0.0,
    keto: 0.0,
    histamine_low: 0.0,
    pregnancy_safe: 0.0,
    light_diet: 0.0,
    weight_loss: 0.0,
    muscle_gain: 0.0,
    endurance_training: 0.0,
    marathon_training: 0.0,
    quick_after_work: 0.0,
    office_lunch: 0.0,
    camping: 0.0,
    party_food: 0.0,
    picnic: 0.0,
    seasonal_preferences: 0.0,
    air_fryer: 0.0,
    grill: 0.0,
    frying: 0.0,
    steaming: 0.0,
    fermenting: 0.0,
    oven_cooking: 0.0,
    pressure_cooker: 0.0,
    thermomix_user: 0.0,
  });

  const [allergies, setAllergies] = useState<string[]>([]);
  const [cookingTime, setCookingTime] = useState('');


  const togglePreference = (key: keyof Preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key] === 1.0 ? 0.0 : 1.0
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const steps = [
    {
      id: 'nutrition',
      title: 'Nutritional Preferences',
      icon: 'ri-heart-pulse-line',
      description: 'Select your nutritional priorities'
    },
    {
      id: 'dietary',
      title: 'Dietary Restrictions',
      icon: 'ri-shield-check-line',
      description: 'Any dietary requirements or restrictions?'
    },
    {
      id: 'goals',
      title: 'Your Goals',
      icon: 'ri-trophy-line',
      description: 'What are your health and fitness goals?'
    },
    {
      id: 'lifestyle',
      title: 'Meal Context',
      icon: 'ri-time-line',
      description: 'When and where do you typically eat?'
    },
    {
      id: 'cooking',
      title: 'Cooking Methods',
      icon: 'ri-fire-line',
      description: 'How do you prefer to cook?'
    },
    {
      id: 'details',
      title: 'Final Details',
      icon: 'ri-settings-4-line',
      description: 'Just a few more details'
    }
  ];

  const totalSteps = steps.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const selectedCount = Object.values(preferences).filter(v => v === 1.0).length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Helper function to parse "30-45" into [30, 45]
  const parseCookingTime = (timeStr: string) => {
    if (timeStr === '60+') return { min: 60, max: 999 }; // Handle "60+" case

    const [min, max] = timeStr.split('-').map(Number);
    return { min, max };
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const preferenceVector = Object.keys(preferences).map(key => preferences[key as keyof Preferences]);
    
    console.log('Preference Vector (35 dimensions):', preferenceVector);
    console.log('Allergies:', allergies);
    console.log('Cooking Time:', cookingTime);
    
    // Convert "30-45" into min=30, max=45
    const { min, max } = parseCookingTime(cookingTime);
    
    const payload: UserPreferences = {
      allergies : allergies,
      min_cooking_time: min,
      max_cooking_time: max, 
      preference_vector: preferenceVector
    };


    try {
      console.log("Saving preferences");
      await userApi.savePreferences(payload);
      console.log("Preferences saved");
      window.REACT_APP_NAVIGATE('/market-selection');
    } catch (error) {
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const PreferenceCard = ({ 
    keyName, 
    label, 
    icon 
  }: { 
    keyName: keyof Preferences; 
    label: string; 
    icon: string;
  }) => {
    const isSelected = preferences[keyName] === 1.0;
    return (
      <button
        type="button"
        onClick={() => togglePreference(keyName)}
        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${
          isSelected
            ? 'border-[#2F855A] bg-[#2F855A]/5 shadow-md'
            : 'border-gray-200 bg-white hover:border-[#2F855A]/30 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            isSelected ? 'bg-[#2F855A] text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-[#2F855A]/10 group-hover:text-[#2F855A]'
          }`}>
            <i className={`${icon} text-xl`}></i>
          </div>
          <span className={`text-sm font-semibold ${isSelected ? 'text-[#2F855A]' : 'text-gray-700'}`}>
            {label}
          </span>
        </div>
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-[#2F855A] rounded-full">
            <i className="ri-check-line text-white text-sm"></i>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://public.readdy.ai/ai/img_res/b0724f47-0896-45dd-92da-e15712b65265.png" 
            alt="Recipe Recommender Logo" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Build Your Recipe Profile</h1>
          <p className="text-sm text-gray-600">Help us understand your preferences for personalized recommendations</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-sm text-gray-600">
              {selectedCount} preferences selected
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-[#2F855A] to-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 flex items-center justify-center bg-[#2F855A]/10 rounded-2xl mx-auto mb-4">
              <i className={`${steps[currentStep].icon} text-3xl text-[#2F855A]`}></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{steps[currentStep].title}</h2>
            <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
          </div>

          {/* Step 1: Nutritional Preferences */}
          {currentStep === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PreferenceCard keyName="low_sugar" label="Low Sugar" icon="ri-drop-line" />
              <PreferenceCard keyName="low_carb" label="Low Carb" icon="ri-bread-line" />
              <PreferenceCard keyName="high_carb" label="High Carb" icon="ri-seedling-line" />
              <PreferenceCard keyName="high_protein" label="High Protein" icon="ri-bear-smile-line" />
              <PreferenceCard keyName="low_fat" label="Low Fat" icon="ri-temp-cold-line" />
              <PreferenceCard keyName="healthy_fats" label="Healthy Fats" icon="ri-heart-add-line" />
              <PreferenceCard keyName="high_fiber" label="High Fiber" icon="ri-leaf-line" />
              <PreferenceCard keyName="cholesterol_low" label="Low Cholesterol" icon="ri-heart-pulse-line" />
            </div>
          )}

          {/* Step 2: Dietary Restrictions */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PreferenceCard keyName="gluten_free" label="Gluten Free" icon="ri-forbid-2-line" />
              <PreferenceCard keyName="lactose_free" label="Lactose Free" icon="ri-cup-line" />
              <PreferenceCard keyName="vegan" label="Vegan" icon="ri-plant-line" />
              <PreferenceCard keyName="vegetarian" label="Vegetarian" icon="ri-leaf-line" />
              <PreferenceCard keyName="paleo" label="Paleo" icon="ri-ancient-gate-line" />
              <PreferenceCard keyName="keto" label="Keto" icon="ri-fire-line" />
              <PreferenceCard keyName="histamine_low" label="Low Histamine" icon="ri-shield-check-line" />
              <PreferenceCard keyName="pregnancy_safe" label="Pregnancy Safe" icon="ri-parent-line" />
              <PreferenceCard keyName="light_diet" label="Light Diet" icon="ri-sun-line" />
            </div>
          )}

          {/* Step 3: Goals */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PreferenceCard keyName="weight_loss" label="Weight Loss" icon="ri-scales-3-line" />
              <PreferenceCard keyName="muscle_gain" label="Muscle Gain" icon="ri-heart-pulse-line" />
              <PreferenceCard keyName="endurance_training" label="Endurance Training" icon="ri-run-line" />
              <PreferenceCard keyName="marathon_training" label="Marathon Training" icon="ri-trophy-line" />
            </div>
          )}

          {/* Step 4: Meal Context */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PreferenceCard keyName="quick_after_work" label="Quick After Work" icon="ri-time-line" />
              <PreferenceCard keyName="office_lunch" label="Office Lunch" icon="ri-briefcase-line" />
              <PreferenceCard keyName="camping" label="Camping" icon="ri-tent-line" />
              <PreferenceCard keyName="party_food" label="Party Food" icon="ri-cake-3-line" />
              <PreferenceCard keyName="picnic" label="Picnic" icon="ri-sun-line" />
              <PreferenceCard keyName="seasonal_preferences" label="Seasonal Preferences" icon="ri-contrast-2-line" />
            </div>
          )}

          {/* Step 5: Cooking Methods */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PreferenceCard keyName="air_fryer" label="Air Fryer" icon="ri-temp-hot-line" />
              <PreferenceCard keyName="grill" label="Grill" icon="ri-fire-line" />
              <PreferenceCard keyName="frying" label="Frying" icon="ri-restaurant-line" />
              <PreferenceCard keyName="steaming" label="Steaming" icon="ri-mist-line" />
              <PreferenceCard keyName="fermenting" label="Fermenting" icon="ri-flask-line" />
              <PreferenceCard keyName="oven_cooking" label="Oven Cooking" icon="ri-home-gear-line" />
              <PreferenceCard keyName="pressure_cooker" label="Pressure Cooker" icon="ri-timer-line" />
              <PreferenceCard keyName="thermomix_user" label="Thermomix User" icon="ri-apps-2-line" />
            </div>
          )}

          {/* Step 6: Final Details */}
          {currentStep === 5 && (
            <div className="space-y-8">
              {/* Allergies */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-alert-line text-red-500"></i>
                  Allergies & Intolerances
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Nuts', 'Dairy', 'Chocolate', 'Eggs', 'Fish', 'Shellfish', 'Soy', 'Wheat', 'Sesame'].map(allergy => (
                    <button
                      key={allergy}
                      type="button"
                      onClick={() => toggleAllergy(allergy)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                        allergies.includes(allergy)
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                      }`}
                    >
                      {allergy}
                      {allergies.includes(allergy) && (
                        <i className="ri-close-line ml-1"></i>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooking Time */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-timer-line text-[#2F855A]"></i>
                  Typical Cooking Time Available
                </h3>
                <div className="grid grid-cols-3 xs:grid-cols-5 gap-2">
                  {[
                    { value: '0-15', label: '0-15' },
                    { value: '15-30', label: '15-30' },
                    { value: '30-45', label: '30-45' },
                    { value: '45-60', label: '45-60' },
                    { value: '60+', label: '60+' }
                  ].map(time => (
                    <button
                      key={time.value}
                      type="button"
                      onClick={() => setCookingTime(time.value)}
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        cookingTime === time.value
                          ? 'border-[#2F855A] bg-[#2F855A]/5 text-[#2F855A]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#2F855A]/30'
                      }`}
                    >
                      {time.label}<span className="hidden sm:inline"> min</span>
                    </button>
                  ))}
                </div>
              </div>


            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Back
            </button>
          )}
          
          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap"
            >
              Continue
              <i className="ri-arrow-right-line ml-2"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 py-4 bg-gradient-to-r from-[#2F855A] to-emerald-600 text-white rounded-xl font-semibold hover:from-[#276749] hover:to-emerald-700 transition-all shadow-lg cursor-pointer whitespace-nowrap"
            >
              <i className="ri-check-line mr-2"></i>
              Get Recommendations
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
