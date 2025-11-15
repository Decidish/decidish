// App.js - 让 React Navigation 成为主入口（适配 Expo Router）
import "expo-router/entry";
import { Text } from "react-native";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./containers/Home";
import MatchesScreen from "./containers/Matches";
import ProfileScreen from "./containers/Profile";
import RecipeScreen from "./containers/Recipes";

import styles from "./assets/styles";
import Icon from "./components/Icon";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: true,
            tabBarLabelStyle: {
              fontSize: 10,
              textTransform: "uppercase",
              paddingTop: 0,
            },
            tabBarStyle: {
              backgroundColor: "#ffe4b5",
              borderTopWidth: 0,
              paddingVertical: 10,
              height: 55,
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowColor: "#000",
              shadowOffset: { height: 0, width: 0 },
            },
            tabBarIcon: ({ focused }) => {
              const iconFocused = focused ? "#7444C0" : "#363636";
              let iconName = "explore";

              if (route.name === "Explore") iconName = "explore";
              if (route.name === "Matches") iconName = "heart";
              if (route.name === "Recipe") iconName = "food";
              if (route.name === "Profile") iconName = "user";

              return (
                <Text style={[styles.iconMenu, { color: iconFocused }]}>
                  <Icon name={iconName} />
                </Text>
              );
            },
          })}
        >
          <Tab.Screen name="Explore" component={HomeScreen} />
          <Tab.Screen name="Matches" component={MatchesScreen} />
          <Tab.Screen name="Recipe" component={RecipeScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
