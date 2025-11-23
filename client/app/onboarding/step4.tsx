// client/app/onboarding/step4.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sun, CalendarDays, Clock } from 'lucide-react-native';

export default function OnboardingStep4() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const options = [
    {
      label: 'Every day',
      icon: Sun,
    },
    {
      label: '4–6 times a week',
      icon: CalendarDays,
    },
    {
      label: '2–3 times a week',
      icon: CalendarDays,
    },
    {
      label: 'Occasionally',
      icon: Clock,
    },
  ];

  const handleNext = () => {
    if (!selected) return;
    // TODO: store the user's cooking frequency
    // await AsyncStorage.setItem('cookFrequency', selected);
    router.push('/onboarding/step5');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 bg-sky-50">
        {/* progress bar */}
        <View className="pt-10 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Step 3 of 6
            </Text>
            <Text className="text-sm font-medium text-emerald-600">50%</Text>
          </View>

          <View className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
            <View className="h-full w-1/2 rounded-full bg-emerald-500" />
          </View>
        </View>

        {/* white card */}
        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
            {/* icon & title */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Icon as={CalendarDays} className="text-emerald-500" size={28} />
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
                      ${isActive ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <View className="mr-4 h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                      <Icon
                        as={opt.icon}
                        className={isActive ? 'text-emerald-600' : 'text-emerald-500'}
                        size={20}
                      />
                    </View>
                    <Text
                      className={`
                        text-base font-semibold
                        ${isActive ? 'text-emerald-800' : 'text-slate-800'}
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
                className="w-[48%] rounded-xl py-3 bg-slate-100"
                onPress={() => router.back()}
              >
                <Text className="text-slate-700 font-semibold text-center">
                  Back
                </Text>
              </Button>

              <Button
                disabled={!selected}
                className={`w-[48%] rounded-xl py-3 ${
                  selected ? 'bg-emerald-500' : 'bg-slate-200'
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
