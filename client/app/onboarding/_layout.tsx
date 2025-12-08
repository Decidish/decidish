import { Stack } from 'expo-router';
import { OnboardingProvider } from './context'; 

export default function OnboardingLayout() {
  return (
    // Wrap all steps in the Provider
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}