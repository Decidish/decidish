import styles from '@/assets/styles';

import { Text, View } from 'react-native';
import {Icon} from "@/components/ui/icon";
import {Banana, Cake, Eye, User} from "lucide-react-native";
import {Component} from "react";

// TODO: Turn into react function and add proper TypeScript types
// @ts-ignore
class ProfileItem extends Component<{
    code: any,
    info1: any,
    info2: any,
    info3: any,
    info4: any,
    location: any,
    name: any
}> {
    render() {
        let {
            code,
            info1,
            info2,
            info3,
            info4,
            location,
            name
        } = this.props;
        return (
            <View style={styles.containerProfileItem}>

                <Text style={styles.name}>{name}</Text>

                <Text style={styles.descriptionProfileItem}>
                    {code} - {location}
                </Text>

                <View style={styles.info}>
                    <Text style={styles.iconProfile}>
                        <Icon as={User}/>
                    </Text>
                    <Text style={styles.infoContent}>{info1}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.iconProfile}>
                        <Icon as={Banana}/>
                    </Text>
                    <Text style={styles.infoContent}>{info2}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.iconProfile}>
                        <Icon as={Cake}/>
                    </Text>
                    <Text style={styles.infoContent}>{info3}</Text>
                </View>

                <View style={styles.info}>
                    <Text style={styles.iconProfile}>
                        <Icon as={Eye}/>
                    </Text>
                    <Text style={styles.infoContent}>{info4}</Text>
                </View>
            </View>
        );
    }
}

export default ProfileItem;
