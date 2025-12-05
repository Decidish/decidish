import React from 'react';
import styles from '@/assets/styles';

import { Image, Text, View, type ImageSourcePropType } from 'react-native';

export interface RecipeProps {
  image: ImageSourcePropType;
  name: string;
  recipe: string;
}

const Recipe: React.FC<RecipeProps> = ({ image, name, recipe }) => {
  return (
    <View style={styles.containerRecipe}>
      <Image source={image} style={styles.avatar} />
      <View style={styles.recipeContent}>
        <Text>{name}</Text>
        <Text
          style={styles.recipe}
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {recipe}
        </Text>
      </View>
    </View>
  );
};

export default Recipe;
