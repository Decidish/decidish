import React, {useState} from "react";
import {Dimensions, Image, Modal, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {Icon} from "@/components/ui/icon";
import {Clock, Flame, Users, X} from "lucide-react-native";
import {Recipe} from "@/api/models/recipe";


// The Props now accept the full Recipe object + actions
export interface CardItemProps {
    recipe: Recipe;
    actions?: boolean; // If true, we could render buttons inside (optional)
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get("window");

const CardItem: React.FC<CardItemProps> = ({recipe}) => {
    // Safety check
    const [modalVisible, setModalVisible] = useState(false);
    if (!recipe) return <View/>;

    return (
        <View
            className="bg-white w-full h-full rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            {/* === 1. IMAGE HEADER === */}
            <View className="h-1/2 relative">
                <Image
                    // React Native Image handles both local (require) and remote (uri)
                    source={typeof recipe.image === 'string' ?
                        {uri: recipe.image} : recipe.image}
                    style={{
                        width: '100%',
                        height: '100%',
                        resizeMode: 'cover'
                    }}
                />


                {/* Floating Badges (Hardcoded for demo as they aren't in your model yet) */}
                {/* <View className="absolute top-4 right-4 flex-row gap-2">
          <View className="px-3 py-1 bg-white/90 rounded-full backdrop-blur-sm">
            <Text className="text-xs font-bold text-gray-800">$12.50</Text>
          </View>
          <View className="px-3 py-1 bg-orange-600/90 rounded-full backdrop-blur-sm">
            <Text className="text-xs font-bold text-white">Easy</Text>
          </View>
        </View> */}
            </View>

            {/* === 2. CONTENT BODY === */}
            <TouchableOpacity className="w-full h-full"
                              onPress={() => setModalVisible(true)}
                              activeOpacity={0.7}
            >
                <View className="flex-1 bg-white p-5">

                    {/* Title */}
                    <View>
                        <Text numberOfLines={1} adjustsFontSizeToFit
                              className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                            {recipe.title}
                        </Text>
                    </View>

                    {/* Tags (from your Model) */}
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {recipe.keyWords?.slice(0, 3).map((tag, i) => (
                            <View key={i} className="px-3 py-1 bg-green-50 rounded-full">
                                <Text className="text-[10px] font-bold text-green-700 uppercase">
                                    {tag}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View className="flex-row justify-between mb-4 border-b border-gray-100 pb-4">
                        {/* Stats Row (Prep, Cook, Servings) */}
                        {recipe.prepTime != null && recipe.prepTime > 0 && (
                            <StatItem
                                icon={Clock}
                                color="text-orange-600"
                                bgColor="bg-orange-50"
                                label="Prep"
                                // Use the value directly
                                value={`${recipe.prepTime} min`}
                            />
                        )}
                        {recipe.cookTime != null && recipe.cookTime > 0 && (
                            <StatItem
                                icon={Flame}
                                color="text-green-600"
                                bgColor="bg-green-50"
                                label="Cook"
                                value={`${recipe.cookTime} min`}
                            />
                        )}
                        {recipe.totalTime != null && recipe.totalTime > 0 && (
                            <StatItem
                                icon={Flame}
                                color="text-green-600"
                                bgColor="bg-green-50"
                                label="Cook"
                                value={`${recipe.totalTime} min`}
                            />
                        )}
                        <StatItem
                            icon={Users}
                            color="text-blue-600"
                            bgColor="bg-blue-50"
                            label="Servings"
                            value={recipe.yields.toString()}
                        />
                    </View>

                    {/* Nutrition Grid (Using your Nutrition Interface) */}
                    <View className="bg-gray-50 rounded-xl p-3 flex-row justify-between mb-4">
                        <NutriItem val={recipe.nutrients.calories} label="Calories" color="text-orange-600"/>
                        {/*<NutriItem val={`${recipe.nutrition.protein}g`} label="Protein" color="text-green-600" />*/}
                        {/*<NutriItem val={`${recipe.nutrition.carbs}g`} label="Carbs" color="text-blue-600" />*/}
                        {/*<NutriItem val={`${recipe.nutrition.fat}g`} label="Fat" color="text-yellow-600" />*/}
                    </View>

                    {/* Ingredients Preview */}
                    <View>
                        <Text className="text-xs font-bold text-gray-500 mb-2">Key Ingredients</Text>
                        <View className="flex-row flex-wrap gap-1">
                            {recipe.ingredients?.slice(0, 5).map((ing, i) => (
                                <Text key={i}
                                      className="text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded-md overflow-hidden mb-1">
                                    {ing}
                                </Text>
                            ))}
                            {recipe.ingredients.length > 5 && (
                                <Text className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                    +{recipe.ingredients.length - 5} more
                                </Text>
                            )}
                        </View>
                    </View>

                </View>
            </TouchableOpacity>
            {/* Modal component - popup */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    activeOpacity={1}
                    className="flex-1 w-full h-full justify-center items-center bg-black/50 cursor-default p-5"
                >
                    {/* Popup Container */}
                    <TouchableOpacity
                        onPress={() => {
                        }}
                        activeOpacity={1}
                        className="bg-white md:max-w-3xl w-full h-full rounded-3xl p-1 overflow-hidden cursor-default"
                    >

                        {/* Header with Close Button */}
                        <View
                            className="bg-white flex-row w-full justify-between items-center px-4 py-4 border-b border-gray-200">
                            <Text className="flex-1 text-2xl font-bold text-gray-900">
                                {recipe.title}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="p-2 bg-gray-100 rounded-full flex-shrink-0"
                            >
                                <X size={24} color="#333"/>
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Content */}
                        <ScrollView className="flex-1 bg-white w-full h-full" contentContainerStyle={{padding: 20}}>

                            <View className="flex-row flex-wrap gap-2 mb-4">
                                {recipe.keyWords?.map((tag, i) => (
                                    <View key={i} className="px-3 py-1 bg-green-50 rounded-full">
                                        <Text className="text-[10px] font-bold text-green-700 uppercase">
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Stats Row (Prep, Cook, Servings) */}
                            <View className="flex-row justify-between mb-4 border-b border-gray-100 pb-4">
                                <StatItem
                                    icon={Clock}
                                    color="text-orange-600"
                                    bgColor="bg-orange-50"
                                    label="Prep"
                                    value={`${recipe.prepTime} min`}
                                />
                                <StatItem
                                    icon={Flame}
                                    color="text-green-600"
                                    bgColor="bg-green-50"
                                    label="Cook"
                                    value={`${recipe.cookTime} min`}
                                />
                                <StatItem
                                    icon={Users}
                                    color="text-blue-600"
                                    bgColor="bg-blue-50"
                                    label="Servings"
                                    value={recipe.yields.toString()}
                                />
                            </View>

                            {/* Nutrition Grid (Using your Nutrition Interface) */}
                            <View className="bg-gray-50 rounded-xl p-3 flex-row justify-between mb-4">
                                <NutriItem val={recipe.nutrients.calories} label="Calories" color="text-orange-600"/>
                                {/*<NutriItem val={`${recipe.nutrition.protein}g`} label="Protein" color="text-green-600" />*/}
                                {/*<NutriItem val={`${recipe.nutrition.carbs}g`} label="Carbs" color="text-blue-600" />*/}
                                {/*<NutriItem val={`${recipe.nutrition.fat}g`} label="Fat" color="text-yellow-600" />*/}
                            </View>

                            {/* Ingredients Preview */}
                            <View>
                                <Text className="text-xs font-bold text-gray-500 mb-2">Key Ingredients</Text>
                                <View className="flex-row flex-wrap gap-1">
                                    {recipe.ingredients?.map((ing, i) => (
                                        <Text key={i}
                                              className="text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded-md overflow-hidden mb-1">
                                            {ing}
                                        </Text>
                                    ))}
                                    {/* {recipe.ingredients.length > 5 && (
                      <Text className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                        +{recipe.ingredients.length - 5} more
                      </Text>
                    )} */}
                                </View>
                            </View>

                            <View className="mt-6">
                                <Text className="text-lg font-bold text-gray-900">Instructions</Text>
                                <View
                                    className="bg-gradient-to-b from-teal-50 to-transparent rounded-2xl overflow-hidden">
                                    {recipe.instructions?.split("\n").map((instruction, i) => (
                                        <View
                                            key={i}
                                            className="flex-row py-4 border-b border-teal-100"

                                        >
                                            {/* Step Number Badge */}
                                            <View
                                                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0 mr-2">
                                                <Text className="text-teal-500 font-bold text-base">
                                                    {i + 1}.
                                                </Text>
                                            </View>

                                            {/* Instruction Text */}
                                            <Text
                                                className="flex-1 text-base text-gray-700 leading-6"
                                                style={{marginTop: 4}}
                                            >
                                                {instruction}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};


/* --- Helper Components for cleanliness --- */

const StatItem = ({icon: IconComponent, color, bgColor, label, value}: any) => (
    <View className="flex-row items-center gap-2">
        <View className={`w-8 h-8 ${bgColor} rounded-full items-center justify-center`}>
            <Icon as={IconComponent} className={color} size={14}/>
        </View>
        <View>
            <Text className="text-[10px] text-gray-400">{label}</Text>
            <Text className="text-xs font-bold text-gray-800">{value}</Text>
        </View>
    </View>
);

const NutriItem = ({val, label, color}: any) => (
    <View className="items-center flex-1">
        <Text className={`text-sm font-bold ${color}`}>{val}</Text>
        <Text className="text-[10px] text-gray-400">{label}</Text>
    </View>
);

export default CardItem;