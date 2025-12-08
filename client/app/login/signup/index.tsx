import { SignUpForm } from '@/components/sign-up-form';
import { ScrollView, View } from 'react-native';
import {Stack} from "expo-router";
import React from "react";

export default function SignUpScreen() {
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SignUpForm />
        </>
    );
}