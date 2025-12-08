import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Text} from '@/components/ui/text';
import * as React from 'react';
import {Pressable, type TextInput, View} from 'react-native';
import {useRouter} from "expo-router";
import loginUser from "@/api/auth_client";
import {useState} from "react";

export function SignInForm() {
    const router = useRouter()
    const passwordInputRef = React.useRef<TextInput>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    function onEmailSubmitEditing() {
        passwordInputRef.current?.focus();
    }

    async function onSubmit() {
        loginUser({
            username: username,
            password: password
        })
            .then(res => {
                if (res.status != 200) {
                    console.log("Could not login")
                } else {
                    router.push('/onboarding/step2')
                }
            })
            .catch(err => {
                console.log(err)
            })
        // TODO: Submit form and navigate to protected screen if successful
    }

    return (
        <View className="gap-6">
            <Card className="border-border/0 sm:border-border shadow-none sm:shadow-sm sm:shadow-black/5">
                <CardHeader>
                    <CardTitle className="text-center text-xl sm:text-left">Sign in to your app</CardTitle>
                    <CardDescription className="text-center sm:text-left">
                        Welcome back! Please sign in to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-6">
                    <View className="gap-6">
                        <View className="gap-1.5">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="username"
                                keyboardType="default"
                                autoComplete="username"
                                autoCapitalize="none"
                                onSubmitEditing={onEmailSubmitEditing}
                                onChangeText={text => setUsername(text)}
                                returnKeyType="next"
                                submitBehavior="submit"
                            />
                        </View>
                        <View className="gap-1.5">
                            <View className="flex-row items-center">
                                <Label htmlFor="password">Password</Label>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="web:h-fit ml-auto h-4 px-1 py-0 sm:h-4"
                                    onPress={() => {
                                        // TODO: Navigate to forgot password screen
                                    }}>
                                    <Text className="font-normal leading-4">Forgot your password?</Text>
                                </Button>
                            </View>
                            <Input
                                ref={passwordInputRef}
                                id="password"
                                secureTextEntry
                                returnKeyType="send"
                                onChangeText={text => setPassword(text)}
                                onSubmitEditing={onSubmit}
                            />
                        </View>
                        <Button className="w-full" onPress={onSubmit}>
                            <Text>Continue</Text>
                        </Button>
                    </View>
                    <Text className="text-center text-sm">
                        Don&apos;t have an account?{' '}
                        <Pressable
                            onPress={() => {
                                router.push("/login/signup")
                            }}>
                            <Text className="text-sm underline underline-offset-4">Sign up</Text>
                        </Pressable>
                    </Text>
                    {/*<View className="flex-row items-center">*/}
                    {/*  <Separator className="flex-1" />*/}
                    {/*  <Text className="text-muted-foreground px-4 text-sm">or</Text>*/}
                    {/*  <Separator className="flex-1" />*/}
                    {/*</View>*/}
                    {/*<SocialConnections />*/}
                </CardContent>
            </Card>
        </View>
    );
}
