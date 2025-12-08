// client/app/onboarding/step6.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    // TODO: store allergies（optional）
    // await AsyncStorage.setItem('allergies', JSON.stringify(selected));

    // directly jumped to home or somewhere else
    router.push('/onboarding/step7');
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
                    Step 5 of 6
                  </Text>
                </View>
                {/* bar */}
                <View className="h-1.5 w-full rounded-full bg-teal-100 overflow-hidden">
                  <View className="h-full rounded-full bg-teal-500" 
                   style={{ width: '80%' }}/>
                </View>
              </View>
          <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">
            {/* icon + title */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                <Icon as={AlertTriangle} className="text-teal-500" size={28} />
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
                      ${isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}
                    `}
                  >
                    <Text adjustsFontSizeToFit
                      className={`
                        text-center font-semibold
                        ${isActive ? 'text-teal-800' : 'text-slate-800'}
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
                className="w-[48%] rounded-xl  bg-slate-100"
                onPress={() => router.back()}
              >
                <Text className="text-slate-700 font-semibold text-center">
                  Back
                </Text>
              </Button>

              <Button
                className="w-[48%] rounded-xl bg-teal-500 active:bg-teal-600"
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
