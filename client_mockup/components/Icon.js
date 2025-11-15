// components/Icon.js
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const iconMap = {
  heart: { lib: Feather, name: "heart" },
  star: { lib: Feather, name: "star" },
  like: { lib: Feather, name: "thumbs-up" },
  dislike: { lib: Feather, name: "thumbs-down" },
  eye: { lib: Feather, name: "eye"},
  flash: { lib: Ionicons, name: "flash" },
  marker: { lib: Ionicons, name: "location-outline" },
  filter: { lib: Ionicons, name: "filter" },
  user: { lib: Feather, name: "user" },
  circle: { lib: Feather, name: "circle" },
  hashtag: { lib: Feather, name: "hash" },
  calendar: { lib: Feather, name: "calendar" },
  chevronLeft: { lib: Ionicons, name: "chevron-back" },
  optionsV: { lib: Ionicons, name: "ellipsis-vertical" },
  optionsH: { lib: Ionicons, name: "ellipsis-horizontal" },
  chat: { lib: Ionicons, name: "chatbubble-ellipses-outline" },
  explore: { lib: Ionicons, name: "compass-outline" },
  food: { lib: Ionicons, name: "restaurant-outline" },
  chili: { lib: MaterialCommunityIcons, name: "chili-medium-outline" },
  cake: { lib: MaterialCommunityIcons, name: "cake"}
};

const Icon = ({ name, size = 24, color = "#333" }) => {
  const item = iconMap[name];
  if (!item) return null;

  const LibIcon = item.lib;

  return <LibIcon name={item.name} size={size} color={color} />;
};

export default Icon;
