// client/app/onboarding/step3.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Wallet } from 'lucide-react-native';

export default function OnboardingStep3() {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(null);

  const budgets = [
    "Under $50",
    "$50-$100",
    "$100-$150",
    "$150+",
  ];

  const handleNext = () => {
    if (!selected) return;
    // TODO: store the user's budget
    // await AsyncStorage.setItem("weeklyBudget", selected);
    router.push("/onboarding/step4");
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
                      Step 2 of 6
                    </Text>
                  </View>
                  {/* bar */}
                  <View className="h-2 w-full rounded-full bg-teal-100 overflow-hidden">
                    <View className="h-full rounded-full bg-teal-500" 
                    style={{ width: '20%' }}/>
                  </View>
                </View>

                <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">

                  {/* Icon circle */}
                  <View className="mb-6 items-center">
                    <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                      <Icon as={Wallet} className="text-teal-500" size={28} />
                    </View>

                    <Text
                      variant="h3"
                      className="text-center text-2xl font-semibold text-slate-900"
                    >
                      What’s your weekly budget?
                    </Text>

                    <Text
                      variant="p"
                      className="mt-2 text-center text-sm text-slate-500"
                    >
                      We'll find recipes that fit your budget
                    </Text>
                  </View>

                  {/* Budget options (2-column layout) */}
                  <View className="mt-2 flex-row flex-wrap justify-between">
                    {budgets.map((b) => {
                      const isActive = selected === b;

                      return (
                        <TouchableOpacity
                          key={b}
                          onPress={() => setSelected(b)}
                          className={`
                            w-[48%] px-4 py-4 rounded-xl border mb-4
                            ${isActive ? "bg-teal-50 border-teal-500" : "bg-white border-slate-200"}
                          `}
                        >
                          <Text  adjustsFontSizeToFit
                            className={`
                              text-center font-semibold
                              ${isActive ? "text-teal-700" : "text-slate-700"}
                            `}
                          >
                            {b}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Bottom Buttons */}
                  <View className="mt-4 w-full flex-row justify-between">
                    <Button
                      variant="secondary"
                      className="w-[48%] rounded-xl bg-slate-100"
                      onPress={() => router.back()}
                    >
                      <Text className="text-slate-700 font-semibold">Back</Text>
                    </Button>

                    <Button
                      className={`w-[48%] rounded-xl ${
                        selected
                          ? "bg-teal-500"
                          : "bg-slate-200"
                      }`}
                      disabled={!selected}
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
