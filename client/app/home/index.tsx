import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {Stack, useRouter} from 'expo-router';
import { MoonStarIcon, StarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {Dimensions, Image, ImageBackground, type ImageStyle, View} from 'react-native';
import Demo from "@/assets/data/demo.js";
import styles from "@/assets/styles";
import { useRef } from "react";
import Swiper from "react-native-deck-swiper";
import CardItem from "@/components/carditem";
import {ExtendedStackNavigationOptions} from "expo-router/build/layouts/StackClient";


const swiperRef = useRef<Swiper<any>>(null);

// Used for our navigation bar at the top of the screen
const SCREEN_OPTIONS: ExtendedStackNavigationOptions = {
    title: 'Home',
    headerTransparent: true,
    headerRight: () => <ThemeToggle />,
};

const {width: SCTEEN_WIDTH} = Dimensions.get("window")

// TODO: Add proper TypeScript types
export default function HomePage(){
    const swiperRef = useRef<Swiper<any>>(null);
    return (
        <>
            <Stack.Screen options={SCREEN_OPTIONS} />
            <ImageBackground
                source={require("@/assets/images/bg.jpg")}
                style={styles.bg}
                resizeMode="cover"
            >
                <View style={styles.containerHome}>
                    <View style={styles.top}>
                    </View>

                    <View style={{ flex: 1 ,justifyContent: "flex-start", marginTop: 35}}>
                        <Swiper
                            ref={swiperRef}
                            cards={Demo}
                            backgroundColor={"transparent"}
                            stackSize={3}
                            verticalSwipe={false}
                            containerStyle={{
                                backgroundColor: "transparent"
                            }}
                            cardStyle={{
                                width : SCTEEN_WIDTH - 40,
                                alignSelf : "center",
                            }}
                            cardHorizontalMargin={10}
                            cardVerticalMargin={20}
                            renderCard={(item) =>
                                item ? (
                                    <CardItem
                                        image={item.image}
                                        name={item.name}
                                        description={item.description}
                                        matches={item.match}
                                        actions
                                        // @ts-ignore
                                        onPressLeft={() => swiperRef.current.swipeLeft()}
                                        // @ts-ignore
                                        onPressRight={() => swiperRef.current.swipeRight()}
                                        status={null}
                                        variant={null}
                                    />
                                ) : null
                            }
                        />
                    </View>
                </View>
            </ImageBackground>
        </>

    );
};

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
