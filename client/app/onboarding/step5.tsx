// client/app/onboarding/step5.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

// Icons
import { Leaf, Utensils, Flame, Apple, Vegan, Heart } from 'lucide-react-native';

export default function OnboardingStep5() {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const options = [
    { label: 'No Restrictions', icon: Utensils },
    { label: 'Vegetarian', icon: Leaf },
    { label: 'Vegan', icon: Vegan },
    { label: 'Keto', icon: Flame },
    { label: 'Paleo', icon: Apple },
    { label: 'Low Carb', icon: Heart },
  ];

  const handleNext = () => {
    if (selected.length === 0) return;

    // TODO: save selected dietary preferences
    // await AsyncStorage.setItem("dietPreferences", JSON.stringify(selected));
    router.push('/onboarding/step6');
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
                    Step 4 of 6
                  </Text>
                </View>
                {/* bar */}
                <View className="h-2 w-full rounded-full bg-teal-100 overflow-hidden">
                  <View className="h-full rounded-full bg-teal-500" 
                   style={{ width: '60%' }}/>
                </View>
              </View>
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">

            {/* Icon + Titles */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                <Icon as={Utensils} className="text-teal-500" size={28} />
              </View>

              <Text
                variant="h3"
                className="text-center text-2xl font-semibold text-slate-900"
              >
                Dietary preferences?
              </Text>

              <Text
                variant="p"
                className="mt-2 text-center text-sm text-slate-500"
              >
                We’ll tailor recipes to your lifestyle
              </Text>
            </View>

            {/* Preference options */}
            <View className="mt-4 flex-row flex-wrap justify-between">
              {options.map((opt) => {
                const isActive = selected.includes(opt.label);

                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => toggle(opt.label)}
                    className={`
                      w-[48%] mb-4 rounded-2xl border px-4 py-5
                      ${isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <View className="items-center">
                      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <Icon
                          as={opt.icon}
                          className={isActive ? 'text-teal-600' : 'text-slate-600'}
                          size={20}
                        />
                      </View>

                      <Text adjustsFontSizeToFit
                        className={`
                          font-semibold text-center
                          ${isActive ? 'text-teal-800' : 'text-slate-700'}
                        `}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer buttons */}
            <View className="mt-2 flex-row justify-between">
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
                disabled={selected.length === 0}
                className={`w-[48%] rounded-xl ${
                  selected.length > 0 ? 'bg-teal-500' : 'bg-slate-200'
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
