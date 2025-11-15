import { useRef } from "react";
import { Dimensions, ImageBackground, View } from "react-native";
import Swiper from "react-native-deck-swiper";

import Demo from "../assets/data/demo.js";
import styles from "../assets/styles";
import CardItem from "../components/CardItem";

const {width: SCTEEN_WIDTH} = Dimensions.get("window")

const Home = () => {
  const swiperRef = useRef(null);
  return (
      <ImageBackground
        source={require("../assets/images/bg.jpg")}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.containerHome}>
          <View style={styles.top}>
          </View>

          <View style={{ flex: 1 ,justifyContent: "flex-start", marginTop: 35}}>
            <Swiper
              ref={swiperRef}
              cards={Demo}
              backgroundColor={"transparent"}
              stackSize={3}
              verticalSwipe={false}
              containerStyle={{
                backgroundColor: "transparent"
              }}
              cardStyle={{
                width : SCTEEN_WIDTH - 40,
                alighSelf : "center",
              }}
              cardHorizontalMargin={10}
              cardVerticalMargin={20}
              renderCard={(item) =>
                item ? (
                  <CardItem
                    image={item.image}
                    name={item.name}
                    description={item.description}
                    matches={item.match}
                    actions
                    onPressLeft={() => swiperRef.current?.swipeLeft()}
                    onPressRight={() => swiperRef.current?.swipeRight()}
                  />
                ) : null
              }
            />
          </View>
        </View>
      </ImageBackground>
  );
};

export default Home;
