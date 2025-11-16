import {ScrollView, View} from "react-native";
import {Text} from "@/components/ui/text";
import * as React from "react";
import {Stack} from "expo-router";
import styles from "@/assets/styles";

const SCREEN_OPTIONS = {
    title: 'Profile',
    headerTransparent: true,
};

export default function ProfilePage() {
    return (
        <>
            <Stack.Screen options={SCREEN_OPTIONS}/>
            <View className="flex-1 items-center justify-center">
                <Text>This is your profile page</Text>
            </View>
        </>
    )
}