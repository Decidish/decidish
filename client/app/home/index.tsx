// client/app/onboarding/step1.tsx
import React from 'react';
import {Dimensions, Image, ImageBackground, ScrollView, TouchableOpacity, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {Text} from '@/components/ui/text';
import {Icon} from '@/components/ui/icon';
import {ArrowRight, Clock, Heart, Instagram, Linkedin, Trash2, Twitter, User, Utensils} from 'lucide-react-native';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function OnboardingStep1() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push('/login/signin')
        // router.push('/onboarding/step2');
    };

    return (
        <>
            <Stack.Screen options={{headerShown: false}}/>

            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>

                {/* ================= HERO SECTION ================= */}
                <View style={{height: SCREEN_HEIGHT, minHeight: 600}}>
                    <ImageBackground
                        source={require('@/assets/images/step1-background.jpg')}
                        style={{flex: 1, width: '100%', height: '100%'}}
                        resizeMode="cover"
                    >
                        <View className="flex-1 bg-black/40 items-center justify-center px-6">
                            <View className="w-full max-w-4xl items-center">
                                <Text numberOfLines={1} adjustsFontSizeToFit
                                      className="text-white text-6xl md:text-8xl font-extrabold mb-4 p-2 italic text-center">
                                    Decidish
                                </Text>

                                <Text className="text-white text-center text-xl md:text-4xl font-bold mb-6">
                                    Your Personal Meal Planning Assistant
                                </Text>

                                <Text
                                    className="hidden md:flex text-white/90 text-center text-lg md:text-xl leading-relaxed max-w-2xl mb-12">
                                    Save time, reduce waste, and discover delicious recipes tailored to
                                    your budget, taste, and dietary needs.
                                </Text>
                                <TouchableOpacity onPress={handleGetStarted}
                                                  className="rounded-full bg-teal-500 active:bg-teal-600 hover:scale-105 transition-transform px-12 py-6 flex-row items-center gap-3 transform whitespace-nowrap cursor-pointer"
                                >
                                    <Text className="text-white text-xl font-bold">
                                        Get Started Free
                                    </Text>
                                    <Icon as={ArrowRight} className="text-white" size={24}/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ImageBackground>
                </View>

                {/* ================= PAIN POINTS SECTION ================= */}
                <View className="py-12 md:py-20 px-6 bg-slate-50 items-center">
                    <View className="w-full max-w-md md:max-w-6xl">
                        <Text className="text-3xl md:text-5xl font-bold text-center text-gray-800 mb-10">
                            Tired of These Daily Struggles?
                        </Text>

                        {/* RESPONSIVE GRID: flex-col on mobile, flex-row on desktop */}
                        <View className="flex-col md:flex-row md:gap-8">
                            <PainPointCard
                                className="flex-1"
                                icon={Clock} color="text-red-500" bg="bg-red-100"
                                title="Decision Fatigue"
                                desc="Spending too much time deciding what to cook? Ordering expensive takeout because planning feels overwhelming?"
                            />
                            <PainPointCard
                                className="flex-1"
                                icon={Trash2} color="text-orange-500" bg="bg-orange-100"
                                title="Food Waste"
                                desc="Vegetables going bad in your fridge? Buying ingredients you already have? Wasting money on unused food?"
                            />
                            <PainPointCard
                                className="flex-1"
                                icon={Utensils} color="text-purple-500" bg="bg-purple-100"
                                title="Boring Meals"
                                desc="Eating the same pasta every week? Generic recipes that don't match your taste or budget?"
                            />
                        </View>
                    </View>
                </View>

                {/* ================= HOW IT HELPS SECTION ================= */}
                <View className="py-12 md:py-20 px-6 bg-white items-center">
                    <Text className="text-3xl md:text-5xl font-bold text-center text-gray-800 mb-10 md:mb-14">
                        How Decidish Helps You
                    </Text>
                    {/* md: row for image and features */}
                    <View className="w-full max-w-6xl md:grid md:grid-cols-2 gap-8 md:gap-12 ">

                        {/* height and width has to be defined for resize to work */}
                        <View
                            className="hidden md:flex h-full w-full rounded-2xl shadow-lg overflow-hidden items-center">
                            <Image
                                source={require('@/assets/images/woman-kitchen.jpg')}
                                className='w-full h-full'
                                resizeMode='cover'
                            />
                        </View>

                        {/* <View className="w-full md:w-1/2 flex-1 outline"> */}
                        <View className="flex-col justify-center p-5">
                            <FeatureRow
                                icon={User} color="text-teal-600" bg="bg-teal-100"
                                title="Personalized Just for You"
                                desc="Recipes tailored to your budget, dietary preferences, allergies, and local ingredient availability"
                            />
                            <FeatureRow
                                icon={Clock} color="text-teal-600" bg="bg-teal-100"
                                title="Save Time & Money"
                                desc="Plan meals in minutes, create smart shopping lists, and reduce food waste by up to 40%"
                            />
                            <FeatureRow
                                icon={Heart} color="text-teal-600" bg="bg-teal-100"
                                title="Healthier & More Variety"
                                desc="Discover new recipes, maintain nutritional balance, and break free from meal monotony"
                            />
                        </View>
                        {/* </View> */}

                    </View>
                </View>

                {/* ================= 3-STEP PROCESS SECTION ================= */}
                <View className="py-12 md:py-20 px-6 bg-slate-50 items-center">
                    <View className="w-full max-w-6xl">
                        <Text className="text-3xl md:text-5xl font-bold text-center text-gray-800 mb-10 md:mb-16">
                            Simple 3-Step Process
                        </Text>

                        <View className="flex-col md:flex-row md:gap-12">
                            <StepItem
                                className="flex-1"
                                number="1"
                                title="Tell Us About You"
                                desc="Quick quiz about your budget, cooking frequency, dietary preferences, and allergies."
                            />
                            <StepItem
                                className="flex-1"
                                number="2"
                                title="Swipe Your Favorites"
                                desc="Browse personalized recipes and swipe to build your meal plan for the week."
                            />
                            <StepItem
                                className="flex-1"
                                number="3"
                                title="Get Your Shopping List"
                                desc="Automatic shopping list you can edit, share, or use for online grocery ordering."
                            />
                        </View>
                    </View>
                </View>

                {/* ================= READY TO TRANSFORM SECTION ================= */}
                <View className="py-12 md:py-24 px-6 bg-teal-500 items-center">
                    <View className="max-w-5xl items-center">
                        <Text className="text-3xl md:text-5xl font-bold text-center text-white mb-8">
                            Ready to Transform Your Meal Planning?
                        </Text>
                        <Text
                            className="max-w-sm md:max-w-max text-lg md:text-xl text-center text-white/90 mb-8 leading-relaxed">
                            Join thousands of users who are saving time, money, and reducing food waste.
                        </Text>
                        <TouchableOpacity onPress={handleGetStarted}
                                          className="rounded-full bg-white active:bg-gray-100 items-center justify-center px-12 py-6 shadow-lg gap-3 transition-transform hover:scale-105 whitespace-nowrap cursor-pointer"
                        >
                            <Text className="text-teal-600 text-xl font-bold">
                                Get Started Free
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ================= FOOTER ================= */}
                <View className="py-12 md:py-16 px-6 bg-gray-900 items-center">
                    <View className="w-full max-w-6xl">

                        <View className="flex-col md:flex-row justify-between mb-12 gap-12">
                            {/* Brand Column */}
                            <View className="md:w-1/3">
                                <Text className="text-3xl font-bold text-white mb-4 italic">Decidish</Text>
                                <Text className="text-gray-400 text-lg">Your personal meal planning assistant</Text>
                            </View>

                            {/* Links Columns Container */}
                            <View className="flex-row flex-wrap gap-16 md:gap-24">
                                <View>
                                    <Text className="font-bold text-white mb-6 text-lg">Product</Text>
                                    <FooterLink text="Features"/>
                                    <FooterLink text="How It Works"/>
                                    <FooterLink text="Pricing"/>
                                </View>

                                <View>
                                    <Text className="font-bold text-white mb-6 text-lg">Company</Text>
                                    <FooterLink text="About Us"/>
                                    <FooterLink text="Contact"/>
                                    <FooterLink text="Blog"/>
                                </View>

                                {/* Social Icons */}
                                <View>
                                    <Text className="font-bold text-white mb-6 text-lg">Follow Us</Text>
                                    <View className="flex-row gap-4">
                                        <SocialIcon icon={Linkedin}/>
                                        <SocialIcon icon={Instagram}/>
                                        <SocialIcon icon={Twitter}/>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Copyright */}
                        <View className="border-t border-gray-800 pt-8 items-center">
                            <Text className="text-gray-500 text-center">
                                © 2025 Decidish. All rights reserved.
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </>
    );
}

const PainPointCard = ({icon: IconType, color, bg, title, desc, className}: any) => (
    <View className={`bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100 ${className}`}>
        <View className="w-full max-w-6xl flex-row items-center gap-2 md:gap-4">
            <View className={`w-14 h-14 ${bg} rounded-full items-center justify-center mb-4`}>
                <Icon as={IconType} className={color} size={28}/>
            </View>
            <Text className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{title}</Text>
        </View>
        <Text className="text-gray-600 leading-6">{desc}</Text>
    </View>
);

const FeatureRow = ({icon: IconType, color, bg, title, desc, className}: any) => (
    <View className={`flex-row gap-4 mb-8 ${className}`}>
        <View className={`w-12 h-12 ${bg} rounded-full items-center justify-center flex-shrink-0`}>
            <Icon as={IconType} className={color} size={24}/>
        </View>
        <View className="flex-1">
            <Text className="text-xl md:text-2xl font-bold text-gray-800 mb-1">{title}</Text>
            <Text className="text-gray-600 leading-5">{desc}</Text>
        </View>
    </View>
);

const StepItem = ({number, title, desc, className}: any) => (
    <View className={`items-center mb-10 ${className}`}>
        <View className="w-16 h-16 bg-teal-500 rounded-full items-center justify-center mb-6">
            <Text className="text-white text-3xl font-bold">{number}</Text>
        </View>
        <Text className="text-2xl font-bold text-gray-800 mb-2 text-center">{title}</Text>
        <Text className="text-gray-600 text-center leading-6">{desc}</Text>
    </View>
);

const FooterLink = ({text}: { text: string }) => (
    <TouchableOpacity className="mb-2">
        <Text className="text-gray-400 text-base hover:text-white transition-colors">{text}</Text>
    </TouchableOpacity>
);

const SocialIcon = ({icon: IconType}: any) => (
    <TouchableOpacity
        className="w-10 h-10 bg-gray-800 rounded-full items-center justify-center hover:bg-teal-500 transition-colors">
        <Icon as={IconType} className="text-white" size={20}/>
    </TouchableOpacity>
);