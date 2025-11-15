import styles from '../assets/styles/index.js';

import {
  FlatList,
  ImageBackground,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Demo from '../assets/data/demo.js';
import Icon from '../components/Icon.js';
import Recipe from '../components/Recipe.js';

const RecipeScreen = () => {
  return (
    <ImageBackground
      source={require('../assets/images/bg1.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.containerRecipes}>
        <FlatList
        data={Demo}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
          <View style={styles.top}>
            <Text style={styles.title}>Recipe</Text>
            <TouchableOpacity>
              <Text style={styles.icon}>
                <Icon name="optionsV" />
              </Text>
            </TouchableOpacity>
          </View>
          }
            renderItem={({ item }) => (
              <TouchableOpacity>
                <Recipe
                  image={item.image}
                  name={item.name}
                  recipe={item.recipe}
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
      </View>
    </ImageBackground>
  );
};

export default RecipeScreen;
