import React, { Component, type ReactNode } from 'react';
import styles from '@/assets/styles';

import { Text, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Banana, Cake, Eye, User } from 'lucide-react-native';

export interface ProfileItemProps {
  code: ReactNode;
  info1: ReactNode;
  info2: ReactNode;
  info3: ReactNode;
  info4: ReactNode;
  location: ReactNode;
  name: ReactNode;
}

class ProfileItem extends Component<ProfileItemProps> {
  render() {
    const { code, info1, info2, info3, info4, location, name } = this.props;
    return (
      <View style={styles.containerProfileItem}>
        <Text style={styles.name}>{name}</Text>

        <Text style={styles.descriptionProfileItem}>
          {code} - {location}
        </Text>

        <View style={styles.info}>
          <Text style={styles.iconProfile}>
            <Icon as={User} />
          </Text>
          <Text style={styles.infoContent}>{info1}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.iconProfile}>
            <Icon as={Banana} />
          </Text>
          <Text style={styles.infoContent}>{info2}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.iconProfile}>
            <Icon as={Cake} />
          </Text>
          <Text style={styles.infoContent}>{info3}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.iconProfile}>
            <Icon as={Eye} />
          </Text>
          <Text style={styles.infoContent}>{info4}</Text>
        </View>
      </View>
    );
  }
}

export default ProfileItem;
