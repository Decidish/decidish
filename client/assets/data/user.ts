import { User } from '@/api/models/user';

export const MOCK_USER: User = {
    id: 1,
    name: 'Anna Koch',
    level: 'Beginner',
    completedRecipes: 5,
    friends: [ 55, 48, 1004],
    description: 'Amateur cook, love sushi and ramen.',
    coordinates: '29.4600° N, 84.9000° W',
    location: 'Berlin',
    tags: ['Seafood Addict', 'Spice Hunter', 'Sweet-free'],
    status: 'Online',
    image: require('../images/user1.jpg')
    //TODO: add last seen 23h ago

};