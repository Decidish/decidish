// client/app/onboarding/step6.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AlertTriangle } from 'lucide-react-native';

export default function OnboardingStep6() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const options = [
    'Dairy',
    'Eggs',
    'Nuts',
    'Peanuts',
    'Shellfish',
    'Soy',
    'Wheat',
    'Gluten',
  ];

  const handleNext = () => {
    // TODO: 保存 allergies（可选）
    // await AsyncStorage.setItem('allergies', JSON.stringify(selected));

    // 这里可以直接去 home，或者去一个 summary / success 页
    router.replace('/home');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 bg-sky-50">
        {/* progress bar：Step 5 of 6 · 83% */}
        <View className="pt-10 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Step 5 of 6
            </Text>
            <Text className="text-sm font-medium text-emerald-600">83%</Text>
          </View>

          <View className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
            <View className="h-full w-[83%] rounded-full bg-emerald-500" />
          </View>
        </View>

        {/* white card */}
        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
            {/* icon + title */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Icon as={AlertTriangle} className="text-emerald-500" size={28} />
              </View>

              <Text
                variant="h3"
                className="text-center text-2xl font-semibold text-slate-900"
              >
                Any allergies?
              </Text>

              <Text
                variant="p"
                className="mt-2 text-center text-sm text-slate-500"
              >
                Select all that apply (optional)
              </Text>
            </View>

            {/* allergic option */}
            <View className="mt-2 flex-row flex-wrap justify-between">
              {options.map((opt) => {
                const isActive = selected.includes(opt);

                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => toggle(opt)}
                    className={`
                      w-[48%] mb-3 rounded-2xl border px-4 py-4
                      ${isActive ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <Text
                      className={`
                        text-center font-semibold
                        ${isActive ? 'text-emerald-800' : 'text-slate-800'}
                      `}
                    >
                      {opt}
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
                className="w-[48%] rounded-xl py-3 bg-emerald-500 active:bg-emerald-600"
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
