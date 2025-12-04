import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  const opacity = useRef(new Animated.Value(0.1)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/dial"); // navigate to your dial page
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

    return (
    <View style={styles.container}>
        <Animated.Image
        source={require("../assets/images/BackgroundImage.png")}
        style={[
            styles.bgImage,
            {
            opacity,
            transform: [{ scale }],
            },
        ]}
        resizeMode="contain"
        />

        <Animated.View
        style={{
            position: "absolute",
            opacity,
            transform: [{ scale }],
            alignItems: "center",
            padding: 24,
            borderRadius: 16,
        }}
        >
        <Text style={styles.logoText}>Angin</Text>
        <Text style={styles.subtitle}>Your heart’s 911 line</Text>
        </Animated.View>
    </View>
    );
        

}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A9D6F1",
    justifyContent: "center",
    alignItems: "center",
  },
  bgImage: {
    tintColor:"white",
    width: 600,
    height: 600,
  },
  logoText: {
    fontSize: 75,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#FFDE5A",
    fontFamily: "Inter",
    textShadowColor: "rgba(19, 17, 17, 0.4)",

  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#2C3E50",
    fontFamily: "Quicksand",
  },
});
