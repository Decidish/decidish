import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {Stack, useRouter} from 'expo-router';
import { MoonStarIcon, StarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, type ImageStyle, View } from 'react-native';
import {Input} from "@/components/ui/input";

const SCREEN_OPTIONS = {
  title: 'Home',
  headerTransparent: true,
  headerRight: () => <ThemeToggle />,
};

const IMAGE_STYLE: ImageStyle = {
  height: 76,
  width: 76,
};

export default function Screen() {
    const router = useRouter();

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 items-center justify-center gap-8 p-4">
          <View className="flex-row gap-2">
              <Input
                  placeholder={"enter your postal code"}
                  keyboardType={"numeric"}
                  textContentType={"postalCode"}
              />
          </View>
        <View className="flex-row gap-2">
                <Button onPress={() => router.push('/profile')}>
                    <Text>Go to Profile Tab</Text>
                </Button>
            {/*<Button*/}
            {/*    onPress={() => {*/}
            {/*        router.push('/profile');*/}
            {/*    }}>*/}
            {/*    <Text>Go to Profile Tab</Text>*/}
            {/*</Button>*/}
        </View>
      </View>
    </>
  );
}

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}
