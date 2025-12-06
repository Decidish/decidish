import { User } from '@/api/models/user';

export const CURRENT_USER: User = {
    id: 1,
    name: 'Bagpipe',
    race: 'Vouivre',
    description: 'Dietary Restrictions: Lactose intolerance',
    coordinates: '29.4600° N, 84.9000° W',
    location: 'Victoria',
    tags: ['Seafood Addict', 'Spice Hunter', 'Sweet-free'],
    status: 'Online',
    image: require('../images/user1.jpg')
    //TODO: add last seen 23h ago

};