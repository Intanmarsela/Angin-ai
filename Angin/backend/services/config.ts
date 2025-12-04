import { Platform } from "react-native";

const LOCAL_WEB = "http://127.0.0.1:8000";  // Expo Web on laptop
const TUNNEL_URL =
  "https://pseudocrystalline-unfetched-kathy.ngrok-free.dev"; // your ngrok URL

export const BACKEND_BASE_URL =
  Platform.OS === "web" ? LOCAL_WEB : TUNNEL_URL;
