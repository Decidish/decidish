// import personalizationClient from '../personalizationClient'; 
// import { GoRecipe } from '../../types/personalization';

// export const personalizationApi = {
//   getRecommendations: async (userId: string = "test-user"): Promise<GoRecipe[]> => {
//     // Note: You need to pass the user_id. 
//     // If using JWT/Cookies, ensure withCredentials is true in client.ts
//     // For now, assuming you pass it via header or the backend extracts it from token
//     const response = await personalizationClient.get<GoRecipe[]>('/recipes/recommend', {
//         headers: {
//             // If your Go backend expects "user_id" in context from a middleware,
//             // ensure you send the auth token here.
//             // For dev/testing if checking manual string:
//             // "X-User-Id": userId 
//         }
//     });
//     return response.data;
//   }
// };