// client/app/onboarding/step5.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
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

      <View className="flex-1 bg-sky-50">
        {/* Top progress */}
        <View className="pt-10 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Step 4 of 6
            </Text>
            <Text className="text-sm font-medium text-emerald-600">
              67%
            </Text>
          </View>

          <View className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
            <View className="h-full w-[67%] rounded-full bg-emerald-500" />
          </View>
        </View>

        {/* white card */}
        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">

            {/* Icon + Titles */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Icon as={Utensils} className="text-emerald-500" size={28} />
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
                      ${isActive ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <View className="items-center">
                      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                        <Icon
                          as={opt.icon}
                          className={isActive ? 'text-emerald-600' : 'text-slate-600'}
                          size={20}
                        />
                      </View>

                      <Text
                        className={`
                          font-semibold text-center
                          ${isActive ? 'text-emerald-800' : 'text-slate-700'}
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
                className="w-[48%] rounded-xl py-3 bg-slate-100"
                onPress={() => router.back()}
              >
                <Text className="text-slate-700 font-semibold text-center">
                  Back
                </Text>
              </Button>

              <Button
                disabled={selected.length === 0}
                className={`w-[48%] rounded-xl py-3 ${
                  selected.length > 0 ? 'bg-emerald-500' : 'bg-slate-200'
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
      </View>
    </>
  );
}
