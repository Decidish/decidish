import { SignInForm } from '@/components/sign-in-form';
import { ScrollView, View } from 'react-native';
import {Stack} from "expo-router";
import React from "react";

export default function SignInScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
                keyboardDismissMode="interactive">
                <View className="w-full max-w-sm">
                    <SignInForm />
                </View>
            </ScrollView>
        </>
    );
}