import React from "react";
import { Dimensions, Image, Text, TouchableOpacity, View, ImageSourcePropType } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Heart, Star, ThumbsDown, ThumbsUp, Zap } from "lucide-react-native";
import styles from "@/assets/styles";

export interface CardItemProps {
  image: ImageSourcePropType;
  name: string;
  description?: string;
  matches?: number;
  status?: "Online" | "Offline";
  variant?: boolean; // small or large card
  actions?: boolean;
  onPressLeft?: () => void;
  onPressRight?: () => void;
}

const CardItem: React.FC<CardItemProps> = ({
  image,
  name,
  description,
  matches,
  status,
  variant = false,
  actions = false,
  onPressLeft,
  onPressRight,
}) => {
  const fullWidth = Dimensions.get("window").width;

  const imageStyle = {
    borderRadius: 8,
    width: variant ? fullWidth / 2 - 30 : fullWidth - 80,
    height: variant ? 170 : 350,
    margin: variant ? 0 : 20,
  };

  const nameStyle = {
    paddingTop: variant ? 10 : 15,
    paddingBottom: variant ? 5 : 7,
    color: "#363636",
    fontSize: variant ? 15 : 30,
  };

  return (
    <View style={styles.containerCardItem}>
      {/* IMAGE */}
      <Image source={image} style={imageStyle} />

      {/* MATCHES */}
      {matches !== undefined && (
        <View style={styles.matchesCardItem}>
          <Text style={styles.matchesTextCardItem}>
            <Icon as={Heart} /> {matches}% Match!
          </Text>
        </View>
      )}

      {/* NAME */}
      <Text style={nameStyle} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>

      {/* DESCRIPTION */}
      {description && (
        <Text style={styles.descriptionCardItem} numberOfLines={2} ellipsizeMode="tail">
          {description}
        </Text>
      )}

      {/* STATUS */}
      {status && (
        <View style={styles.status}>
          <View style={status === "Online" ? styles.online : styles.offline} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      {/* ACTIONS */}
      {actions && (
        <View style={styles.actionsCardItem}>
          <TouchableOpacity style={styles.miniButton}>
            <Icon as={Star} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onPressLeft}>
            <Icon as={ThumbsUp} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onPressRight}>
            <Icon as={ThumbsDown} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.miniButton}>
            <Icon as={Zap} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CardItem;
