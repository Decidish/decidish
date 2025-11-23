// client/app/onboarding/step1.tsx
import React from 'react';
import { ImageBackground, View, Dimensions, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ArrowRight } from 'lucide-react-native';

export default function OnboardingStep1() {
  const router = useRouter();

  const handleGetStarted = () => {
    // jump to step2 
    router.push('/onboarding/step2');
  };

  return (
    <>
      {/* eliminate the top navigation stuff */}
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style = {{
            flex:1,
            width: '100%',
            height: '100%',
        }}
      >
      <ImageBackground
        // switch to the background images
        source={require('@/assets/images/bg.jpg')}
        style={{ flex: 1,
            width: '100%',
            height: '100%',
         }}
        resizeMode="cover"
      >
        {/* add a semi transparent cover to make the texts more clear */}
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          {/* the main title:  Decidish */}
          <Text
            variant="h1"
            className="text-white text-5xl font-extrabold mb-4 tracking-tight"
          >
            Decidish
          </Text>

          {/* second title */}
          <Text
            variant="h3"
            className="text-white text-center text-2xl font-semibold mb-3"
          >
            Your Personal Meal Planning Assistant
          </Text>

          {/* description */}
          <Text
            variant="p"
            className="text-white/90 text-center max-w-xl leading-relaxed"
          >
            Save time, reduce waste, and discover delicious recipes tailored to
            your budget, taste, and dietary needs.
          </Text>

          {/* CTA button */}
          <Button
            variant="secondary"
            size="lg"
            className="mt-10 rounded-full bg-emerald-500/95 px-10 py-3 active:bg-emerald-600 flex-row items-center gap-2"
            onPress={handleGetStarted}  //jump to the step2 page
          >
            {/* the texts used in the button */}
            <Text className="text-white text-base font-semibold">
              Get Started Free
            </Text>
            <Icon as={ArrowRight} className="text-white" size={18} />
          </Button>

        </View>
      </ImageBackground>
      </View>
    </>
  );
}
