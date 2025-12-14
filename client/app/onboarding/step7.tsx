// client/app/onboarding/step7.tsx
import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Text} from '@/components/ui/text';
import {Button} from '@/components/ui/button';
import {Icon} from '@/components/ui/icon';
import {Search} from 'lucide-react-native';
import UserPreferences from "@/api/models/onboarding_request";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createUserPreference from "@/api/user_pref_client";

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

    function mapToBackendFormat(preferences: UserPreferences) {
        return {
            // Frontend camelCase : Backend snake_case
            postal_code: preferences.postalCode,
            weekly_budget: preferences.weeklyBudget,
            cook_frequency: preferences.cookFrequency,
            diet_preferences: preferences.dietaryPreferences,
            allergies: preferences.allergies,
            serving_per_meal: preferences.servingPerMeal,
            cooking_skill: preferences.cookingSkill,
        };
    }

    const handleComplete = async () => {
        if (!canComplete) return;

        let postalCode = await AsyncStorage.getItem("postalCode")
        let allergies = await AsyncStorage.getItem("allergies")
        // let weeklyBudget = await AsyncStorage.getItem("weeklyBudget")
        // let cookFrequency = await AsyncStorage.getItem("cookFrequency")
        let dietaryPreferences = await AsyncStorage.getItem("dietPreferences")

        let userPreference: UserPreferences = {
            postalCode: postalCode ?? '',
            weeklyBudget: 50, // TODO: Actually set the budget
            cookFrequency: 2, // TODO: Actually set the cooking frequency
            dietaryPreferences: dietaryPreferences ? JSON.parse(dietaryPreferences) : [],
            allergies: allergies ? JSON.parse(allergies) : [],
            servingPerMeal: 2, // TODO: Actually set the servings
            cookingSkill: skill
        }

        createUserPreference(mapToBackendFormat(userPreference))
            .then(res => {
                if (res.status === 200) {
                    console.log("User preferences saved successfully.");
                } else {
                    console.error("Failed to save user preferences:", res.statusText);
                }
            })

        router.push('/recipes'); // jump to the home page after finish
    };

    return (
        <>
            <Stack.Screen options={{headerShown: false}}/>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 bg-teal-50"
            >
                <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>


                    <View className="flex-1 w-full h-full items-center justify-center px-6 py-10">

                        {/* progress */}
                        <View className="w-full max-w-md mb-6">
                            {/* text */}
                            <View className="mb-2 w-full">
                                <Text className="w-full text-sm font-medium text-teal-600"
                                      style={{textAlign: 'right'}}>
                                    Step 6 of 6
                                </Text>
                            </View>
                            {/* bar */}
                            <View className="h-1.5 w-full rounded-full bg-teal-100 overflow-hidden">
                                <View className="h-full w-[100%] rounded-full bg-teal-500"
                                      style={{width: '100%'}}/>
                            </View>
                        </View>
                        <View className="w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-lg shadow-slate-200">

                            {/* Icon + Title */}
                            <View className="mb-6 items-center">
                                <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-teal-50">
                                    <Icon as={Search} className="text-teal-500" size={28}/>
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
                      ${isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}
                    `}
                                        >
                                            <Text
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
                      ${isActive ? 'bg-teal-50 border-teal-500' : 'bg-white border-slate-200'}
                    `}
                                        >
                                            <Text
                                                className={`
                        text-lg font-semibold mb-1
                        ${isActive ? 'text-teal-800' : 'text-slate-800'}
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
                                    className="w-[48%] rounded-xl bg-slate-100"
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
                  w-[48%] rounded-xl
                  ${canComplete ? 'bg-teal-500' : 'bg-slate-200'}
                `}
                                >
                                    <Text className="text-white font-semibold text-center">
                                        Complete
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
