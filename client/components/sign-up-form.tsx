
import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
// Icons
import { Mail, Lock, ArrowRight, UserPlus } from 'lucide-react-native';
// UI Components
import { Text } from '@/components/ui/text';

export function SignUpForm() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.length > 0 && password.length > 0;

  function onSubmit() {
    if (!canSubmit) return;
    // TODO: Create account logic
    router.push('/onboarding/step2');
  }

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
      className="px-6 flex-1 bg-teal-50">
        
        {/* === MAIN CARD === */}
        <View className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-lg p-8">
          
          {/* Header Section */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-teal-50 rounded-full items-center justify-center mb-4">
              <UserPlus size={32} color="#0d9488" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
              Create Account
            </Text>
            <Text className="text-gray-500 text-center">
              Join us to start your meal planning journey
            </Text>
          </View>

          {/* Form Fields */}
          <View className="gap-5">
            {/* Email Field */}
            <View>
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                Email Address
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-4 z-10">
                  <Mail size={20} color="#9ca3af" />
                </View>
                <TextInput
                  placeholder="jane.roe@example.com"
                  value={email}
                  onChangeText={setEmail}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl text-base bg-gray-50 focus:border-teal-500 focus:bg-white"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Field */}
            <View>
              <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                Password
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-4 z-10">
                  <Lock size={20} color="#9ca3af" />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="Create a password"
                  value={password}
                  onChangeText={setPassword}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-xl text-base bg-gray-50 focus:border-teal-500 focus:bg-white"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!canSubmit}
              className={`w-full rounded-xl py-4 flex-row justify-center items-center gap-2 mt-4 shadow-sm ${
                canSubmit 
                  ? 'bg-teal-600 active:bg-teal-700' 
                  : 'bg-gray-200'
              }`}
            >
              <Text className={`text-base font-bold ${canSubmit ? 'text-white' : 'text-gray-400'}`}>
                Get Started
              </Text>
              {canSubmit && <ArrowRight size={20} color="white" />}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View className="mt-8 flex-row justify-center items-center">
            <Text className="text-gray-500 text-sm">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login/signin")}>
              <Text className="text-teal-600 font-bold text-sm">Sign In</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}