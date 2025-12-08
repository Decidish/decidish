import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Define the Shape of ALL data you want to collect
export interface OnboardingData {
  postalCode?: string;
  budget?: number;
  cookFrequency?: number;
  dietaryPreferences: string[];
  allergies: string[];
  servingPerMeal?: number;
  cookingSkill?: string;
}
const defaultData: OnboardingData = {
  postalCode: '',
  budget: undefined,
  cookFrequency: undefined,
  dietaryPreferences: [],
  allergies: [],
  servingPerMeal: 2, // Default to 2 people
  cookingSkill: 'Beginner',
};


// 2. Define the functions we need
interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetData: () => void;
  submitToBackend: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'DECIDISH_ONBOARDING_DRAFT';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);

  // OPTIONAL: Load saved progress from disk when app opens
  useEffect(() => {
    const load = async () => {
     try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setData({ ...defaultData, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to load onboarding state", e);
      }
    };
    load();
  }, []);

  // 3. The Helper to update state AND save to disk
  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newState = { ...prev, ...updates };
      // Save to disk automatically so they don't lose progress if app closes
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  };

  const resetData = () => {
    setData(defaultData);
    AsyncStorage.removeItem(STORAGE_KEY);
  }

  const submitToBackend = async () => {
    const finalPayload = {
        postalCode: data.postalCode,
        weeklyBudget: data.budget,
        cookFrequency: data.cookFrequency,
        dietaryPreferences: data.dietaryPreferences,
        allergies: data.allergies,
        servingPerMeal: data.servingPerMeal,
        cookingSkill: data.cookingSkill,
    };

    console.log("Submitting Payload to Backend:", finalPayload);
    
    // Example: await api.post('/users/preferences', finalPayload);
    
    // Clear local storage after success
    // resetData();
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetData, submitToBackend }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// 4. Custom Hook for easy access
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}