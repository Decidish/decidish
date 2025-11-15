import styles from '../assets/styles';

import { Image, Text, View } from 'react-native';

const Recipe = ({ image, name, recipe }) => {
  return (
    <View style={styles.containerRecipe}>
      <Image source={image} style={styles.avatar} />
      <View style={styles.content}>
        <Text>{name}</Text>
        <Text style={styles.recipe}
        numberOfLines={3}
        ellipsizeMode="tail">{recipe}</Text>
      </View>
    </View>
  );
};

export default Recipe;