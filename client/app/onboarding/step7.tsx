// client/app/onboarding/step7.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Search } from 'lucide-react-native';

export default function OnboardingStep7() {
  const router = useRouter();

  const [servings, setServings] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);

  const servingsOptions = ['1', '2', '3-4', '5+'];

  const skillOptions = [
    {
      label: 'Beginner',
      description: 'Simple recipes',
    },
    {
      label: 'Intermediate',
      description: 'Moderate complexity',
    },
    {
      label: 'Advanced',
      description: 'Complex recipes',
    },
  ];

  const canComplete = servings !== null && skill !== null;

  const handleComplete = () => {
    if (!canComplete) return;

    // TODO: save servings + skill levels
    // await AsyncStorage.setItem("servings", servings)
    // await AsyncStorage.setItem("skillLevel", skill)

    router.replace('/home'); // jump to the home page after finish
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-1 bg-sky-50">
        {/* Top: progress bar */}
        <View className="pt-10 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Step 6 of 6
            </Text>
            <Text className="text-sm font-medium text-emerald-600">
              100%
            </Text>
          </View>

          <View className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
            <View className="h-full w-full rounded-full bg-emerald-500" />
          </View>
        </View>

        {/* Center card */}
        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
            
            {/* Icon + Title */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Icon as={Search} className="text-emerald-500" size={28} />
              </View>

              <Text className="text-center text-2xl font-semibold text-slate-900">
                Almost done!
              </Text>

              <Text className="mt-2 text-center text-sm text-slate-500">
                Just a couple more details
              </Text>
            </View>

            {/* Servings section */}
            <Text className="font-semibold text-slate-800 mb-2 mt-2">
              How many servings per meal?
            </Text>

            <View className="flex-row flex-wrap justify-between mb-6">
              {servingsOptions.map((opt) => {
                const isActive = servings === opt;

                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setServings(opt)}
                    className={`
                      w-[23%] py-3 rounded-xl border mb-3
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

            {/* Skill level section */}
            <Text className="font-semibold text-slate-800 mb-2">
              Cooking skill level?
            </Text>

            <View>
              {skillOptions.map((opt) => {
                const isActive = skill === opt.label;

                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => setSkill(opt.label)}
                    className={`
                      mb-3 rounded-2xl border px-4 py-4
                      ${isActive ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <Text
                      className={`
                        text-lg font-semibold mb-1
                        ${isActive ? 'text-emerald-800' : 'text-slate-800'}
                      `}
                    >
                      {opt.label}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {opt.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Back / Complete buttons */}
            <View className="mt-4 flex-row justify-between">
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
                disabled={!canComplete}
                onPress={handleComplete}
                className={`
                  w-[48%] rounded-xl py-3
                  ${canComplete ? 'bg-emerald-500' : 'bg-slate-200'}
                `}
              >
                <Text className="text-white font-semibold text-center">
                  Complete
                </Text>
              </Button>
            </View>

          </View>
        </View>
      </View>
    </>
  );
}
