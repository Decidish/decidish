// client/app/onboarding/step2.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { MapPin } from 'lucide-react-native';

export default function OnboardingStep2() {
  const router = useRouter();
  const [postalCode, setPostalCode] = useState('');

  const canContinue = postalCode.trim().length > 0;

  const handleNext = () => {
    if (!canContinue) return;

    // TODO: store the user input: postalCode into the global state / AsyncStorage / backend
    // e.g.：await AsyncStorage.setItem('postalCode', postalCode);

    router.push('/onboarding/step3');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* light bg */}
      <View className="flex-1 bg-sky-50">
        {/* the prograss bar on the top */}
        <View className="pt-10 px-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700">
              Step 1 of 6
            </Text>
            <Text className="text-sm font-medium text-emerald-600">17%</Text>
          </View>

          <View className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
            <View className="h-full w-[17%] rounded-full bg-emerald-500" />
          </View>
        </View>

        {/* white card */}
        <View className="flex-1 items-center justify-center px-6 pb-10">
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
            {/* icon */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <Icon as={MapPin} className="text-emerald-500" size={28} />
              </View>
              <Text
                variant="h3"
                className="text-center text-2xl font-semibold text-slate-900"
              >
                Where are you located?
              </Text>
              <Text
                variant="p"
                className="mt-2 text-center text-sm text-slate-500"
              >
                This helps us suggest locally available ingredients.
              </Text>
            </View>

            {/* input box */}
            <View>
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Postal Code
              </Text>
              <Input
                placeholder="Enter your postal code"
                value={postalCode}
                onChangeText={setPostalCode}
                className="mt-1 bg-slate-50"
                keyboardType="default"
              />
            </View>

            {/* Next bottom, when no input disabled */}
            <Button
              disabled={!canContinue}
              onPress={handleNext}
              className={`mt-6 w-full rounded-2xl py-3 ${
                canContinue
                  ? 'bg-emerald-500 active:bg-emerald-600'
                  : 'bg-slate-200'
              }`}
            >
              <Text className="text-center text-sm font-semibold text-white">
                Next
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}
