import styles from '../assets/styles';

import {
  FlatList,
  ImageBackground,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Demo from '../assets/data/demo.js';
import CardItem from '../components/CardItem';
import Icon from '../components/Icon';

const Matches = () => {
  return (
    <ImageBackground
      source={require('../assets/images/bg.jpg')}
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
                <Icon name="optionsV" />
              </Text>
            </TouchableOpacity>
          </View>
          }
            renderItem={({ item }) => (
              <TouchableOpacity>
                <CardItem
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
  );
};

export default Matches;
