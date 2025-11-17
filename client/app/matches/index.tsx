import styles from '@/assets/styles';

import {
    FlatList,
    ImageBackground,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Demo from '@/assets/data/demo.js';
import CardItem from '@/components/carditem';
import {Icon} from "@/components/ui/icon";
import {Option} from "lucide-react-native";
import {Stack} from "expo-router";
import * as React from "react";

const SCREEN_OPTIONS = {
    title: 'Matches',
    headerTransparent: true,
};

const Matches = () => {
    return (
        <>
            <Stack.Screen options={SCREEN_OPTIONS}/>
            <ImageBackground
                source={require('@/assets/images/bg.jpg')}
                style={styles.bg}
                resizeMode="cover"
            >
                <View style={styles.containerMatches}>
                    <FlatList
                        numColumns={2}
                        data={Demo}
                        keyExtractor={(item, index) => index.toString()}
                        ListHeaderComponent={
                            <View style={styles.top}>
                                <Text style={styles.title}>Matches</Text>
                                <TouchableOpacity>
                                    <Text style={styles.icon}>
                                        <Icon as={Option} />
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity>
                                <CardItem
                                    description={"Some description"}
                                    actions={() => {}}
                                    matches={""}
                                    onPressLeft={""}
                                    onPressRight={""}
                                    image={item.image}
                                    name={item.name}
                                    status={item.status}
                                    variant
                                />
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                </View>
            </ImageBackground>
        </>
    );
};

export default Matches;
