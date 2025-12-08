import { SignInForm } from '@/components/sign-in-form';
import { ScrollView, View } from 'react-native';
import {Stack} from "expo-router";
import React from "react";

export default function SignInScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SignInForm />
        </>
    );
}