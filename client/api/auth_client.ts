// TODO: Register user, login with user to have User id inside the http cookie, check if cookie is valid from backend

import axios from "axios";
import LoginRequest from "@/api/models/login_request";

export default async function loginUser(loginRequestBody: LoginRequest) {
    const api = axios.create({
        baseURL: "http://localhost:8083", // TODO: env variable,
        timeout: 10000, // timeout
        withCredentials: true,
    });

    return api.post("login", loginRequestBody)
}