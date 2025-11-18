import styles from '@/assets/styles';

import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import {Icon} from "@/components/ui/icon";
import {Heart, Star, ThumbsDown, ThumbsUp, Zap} from "lucide-react-native";

// TODO: Convert to class component and add proper TypeScript types
// @ts-ignore
const CardItem = ({ actions, description, image, matches, name, onPressLeft, onPressRight, status, variant}) => {
    // Custom styling
    const fullWidth = Dimensions.get('window').width;
    const imageStyle = [
        {
            borderRadius: 8,
            width: variant ? fullWidth / 2 - 30 : fullWidth - 80,
            height: variant ? 170 : 350,
            margin: variant ? 0 : 20
        }
    ];

    const nameStyle = [
        {
            paddingTop: variant ? 10 : 15,
            paddingBottom: variant ? 5 : 7,
            color: '#363636',
            fontSize: variant ? 15 : 30
        }
    ];

    return (
        <View style={styles.containerCardItem}>
            {/* IMAGE */}
            <Image source={image} style={imageStyle} />

            {/* MATCHES */}
            {matches && (
                <View style={styles.matchesCardItem}>
                    <Text style={styles.matchesTextCardItem}>
                        <Icon as={Heart} /> {matches}% Match!
                    </Text>
                </View>
            )}

            {/* NAME */}
            <Text style={nameStyle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
            >{name}</Text>

            {/* DESCRIPTION */}
            {description && (
                <Text style={styles.descriptionCardItem}
                      numberOfLines={2}
                      ellipsizeMode="tail">{description}</Text>
            )}

            {/* STATUS */}
            {status && (
                <View style={styles.status}>
                    <View style={status === 'Online' ? styles.online : styles.offline} />
                    <Text style={styles.statusText}>{status}</Text>
                </View>
            )}

            {/* ACTIONS */}
            {actions && (
                <View style={styles.actionsCardItem}>
                    <TouchableOpacity style={styles.miniButton}>
                        <Text style={styles.star}>
                            <Icon as={Star} />
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={() => onPressLeft()}>
                        <Text style={styles.like}>
                            <Icon as={ThumbsUp} />
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => onPressRight()}
                    >
                        <Text style={styles.dislike}>
                            <Icon as={ThumbsDown} />
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.miniButton}>
                        <Text style={styles.flash}>
                            <Icon as={Zap} />
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default CardItem;
