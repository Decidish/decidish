import axios from "axios";

export default async function createUserPreference(userPreferences: any) {
    const api = axios.create({
        baseURL: "http://localhost:8082", // TODO: env variable,
        timeout: 10000, // timeout
        withCredentials: true,
    });

    return api.post("/api/v1/onboarding", userPreferences)
}