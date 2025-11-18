import {Text} from "@/components/ui/text";
import * as React from "react";
import {Stack} from "expo-router";
import styles from "@/assets/styles";
import {
    ImageBackground,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import User from '@/assets/data/user.js';
import ProfileItem from '@/components/profileitem';
import {Icon} from "@/components/ui/icon";
import {ChevronLeft, CircleEllipsis} from "lucide-react-native";

const SCREEN_OPTIONS = {
    title: 'Profile',
    headerTransparent: true,
};

const Profile = () => {
    const {
        id,
        name,
        Race,
        description,
        code,
        location,
        info1,
        info2,
        info3,
        info4,
        status,
        image
    } = User[0];

    return (
        <>
            <Stack.Screen options={SCREEN_OPTIONS}/>
            <ImageBackground
                source={require('@/assets/images/bg.jpg')}
                style={styles.bg}
                resizeMode="cover"
            >
                <ScrollView style={styles.containerProfile}>
                    <ImageBackground source={image} style={styles.photo}>
                        <View style={styles.top}>
                            <TouchableOpacity>
                                <Text style={styles.topIconLeft}>
                                    <Icon as={ChevronLeft} />
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity>
                                <Text style={styles.topIconRight}>
                                    <Icon as={CircleEllipsis} />
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ImageBackground>

                    <ProfileItem
                        name={name}
                        code={code}
                        location={location}
                        info1={info1}
                        info2={info2}
                        info3={info3}
                        info4={info4}
                    />

                    <View style={styles.actionsProfile}>
                        {/* <TouchableOpacity style={styles.circledButton}>
            <Text style={styles.iconButton}>
              <Icon name="optionsH" />
            </Text>
          </TouchableOpacity> */}

                        {/* <TouchableOpacity style={styles.roundedButton}>
            <Text style={styles.iconButton}>
              <Icon name="chat" />
            </Text>
            <Text style={styles.textButton}>Start chatting</Text>
          </TouchableOpacity> */}
                    </View>
                </ScrollView>
            </ImageBackground>
        </>
    );
};

export default Profile;