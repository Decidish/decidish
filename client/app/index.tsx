import { Redirect } from "expo-router";
import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index(){
    const [ready, setReady] = useState(false);
    const [completed, setCompleted] = useState<boolean |null>(null);

    useEffect(()=>{
        async function checkOnboarding() {
            const value = await AsyncStorage.getItem('onboardingCompleted');
            setCompleted(value === 'true'); //call setcomplete to update the value of complete
            setReady(true);
        }
        checkOnboarding();
    },[]);

    if (!ready) return null;

    if (completed) {
        return <Redirect href="/recipes" />;
    } else{
        return <Redirect href="/home" />;
    }
}


//remember to add following part at the last onboarding page:
// await AsyncStorage.setItem("onboardingCompleted", "true");
// router.replace("/home");
