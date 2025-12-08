import LoginRequest from "@/api/models/login_request";
import axios from "axios";
import {Recipe} from "@/api/models/recipe";

export default async function recommendRecipes() {
    const api = axios.create({
        baseURL: "http://localhost:8082", // TODO: env variable,
        timeout: 10000, // timeout
        withCredentials: true,
    });

    return api.get<Recipe[]>("/api/v1/recipes/recommend")
}