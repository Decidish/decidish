import styles from '../assets/styles';

import {
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import User from '../assets/data/user.js';
import Icon from '../components/Icon';
import ProfileItem from '../components/ProfileItem';

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
    <ImageBackground
      source={require('../assets/images/bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView style={styles.containerProfile}>
        <ImageBackground source={image} style={styles.photo}>
          <View style={styles.top}>
            <TouchableOpacity>
              <Text style={styles.topIconLeft}>
                <Icon name="chevronLeft" />
              </Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.topIconRight}>
                <Icon name="optionsV" />
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
  );
};

export default Profile;
