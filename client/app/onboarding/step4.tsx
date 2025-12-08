// client/app/onboarding/step4.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sun, CalendarDays, Clock } from 'lucide-react-native';

import { useOnboarding } from './context';

export default function OnboardingStep4() {
  const router = useRouter();
  const { data, updateData } = useOnboarding();

  const options = [
    { label: 'Every day', icon: Sun },
    { label: '4–6 times a week', icon: CalendarDays },
    { label: '2–3 times a week', icon: CalendarDays },
    { label: 'Occasionally', icon: Clock },
  ];

  // Initialize from context number (1-4) back to label string
  const [selected, setSelected] = useState<string | null>(
    data.cookFrequency ? options[data.cookFrequency - 1]?.label : null
  );

  const handleNext = () => {
    if (!selected) return;
    
    // Save as Number
    const freqIndex = options.findIndex(opt => opt.label === selected) + 1;
    updateData({ cookFrequency: freqIndex });

    router.push('/onboarding/step5');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-teal-50"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center'}}>
            
            <View className="flex-1 w-full h-full items-center justify-center px-6 py-10">

              {/* progress */}
              <View className="w-full max-w-md mb-6">
                {/* text */}
                <View className="mb-2 w-full">
                  <Text className="w-full text-sm font-medium text-teal-600"
                  style={{ textAlign: 'right' }}>
                    Step 3 of 6
                  </Text>
                </View>
                {/* bar */}
                <View className="h-2 w-full rounded-full bg-teal-100 overflow-hidden">
                  <View className="h-full rounded-full bg-teal-500" 
                   style={{ width: '40%' }}/>
                </View>
              </View>
              <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
                {/* icon & title */}
                <View className="mb-6 items-center">
                  <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                    <Icon as={CalendarDays} className="text-teal-500" size={28} />
                  </View>

                  <Text
                    variant="h3"
                    className="text-center text-2xl font-semibold text-slate-900"
                  >
                    How often do you cook?
                  </Text>

                  <Text
                    variant="p"
                    className="mt-2 text-center text-sm text-slate-500"
                  >
                    This helps us plan the right amount of meals.
                  </Text>
                </View>

                {/* logitudal selection list */}
                <View className="mt-2">
                  {options.map((opt) => {
                    const isActive = selected === opt.label;

                    return (
                      <TouchableOpacity
                        key={opt.label}
                        onPress={() => setSelected(opt.label)}
                        className={`
                          mb-3 flex-row items-center rounded-2xl border px-4 py-4
                          ${isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}
                        `}
                      >
                        <View className="mr-4 h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                          <Icon
                            as={opt.icon}
                            className={isActive ? 'text-teal-600' : 'text-teal-500'}
                            size={20}
                          />
                        </View>
                        <Text
                          className={`
                            text-base font-semibold
                            ${isActive ? 'text-teal-800' : 'text-slate-800'}
                          `}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Back / Next */}
                <View className="mt-4 w-full flex-row justify-between">
                  <Button
                    variant="secondary"
                    className="w-[48%] rounded-xl bg-slate-100"
                    onPress={() => router.back()}
                  >
                    <Text className="text-slate-700 font-semibold text-center">
                      Back
                    </Text>
                  </Button>

                  <Button
                    disabled={!selected}
                    className={`w-[48%] rounded-xl  ${
                      selected ? 'bg-teal-500' : 'bg-slate-200'
                    }`}
                    onPress={handleNext}
                  >
                    <Text className="text-white font-semibold text-center">
                      Next
                    </Text>
                  </Button>
                </View>
              </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>  
    </>
  );
}
