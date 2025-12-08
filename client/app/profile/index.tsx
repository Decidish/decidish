import React from 'react';
import { View, SafeAreaView, TouchableOpacity, Image, ScrollView, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  Settings, 
  LogOut, 
  Award, 
  BookOpen, 
  Users, 
  Edit2,
  UtensilsCrossed
} from 'lucide-react-native';
import { User } from '@/api/models/user';
import { MOCK_USER } from '@/assets/data/user';


export default function ProfilePage() {
  const router = useRouter();
  const user = MOCK_USER;

  const handleLogout = () => {
    // Perform logout logic here 
    router.replace('/');
  };

  return (
    <SafeAreaView className='flex-1 bg-slate-50'>
      <Stack.Screen options={{ headerShown: false }} />

      {/* === HEADER === */}
      <View className='w-full bg-white border-b border-gray-200 px-5 py-4 z-10'>
        <View className='w-full max-w-4xl self-center flex-row justify-between items-center'>
          <View className='flex-row items-center gap-3'>
            <TouchableOpacity onPress={() => router.back()} className='p-2 bg-gray-100 rounded-full'>
              <ArrowLeft size={20} color="#333" />
            </TouchableOpacity>
            <Text className='text-xl font-bold text-gray-900'>My Profile</Text>
          </View>
          <View className='flex-row gap-2'>
            <TouchableOpacity className='p-2 bg-gray-100 rounded-full'>
              <Settings size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} className='p-2 bg-gray-100 rounded-full'>
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className='flex-1' contentContainerStyle={{ paddingBottom: 40 }}>
        <View className='max-w-xl w-full self-center px-4 py-6'>

          {/* === PROFILE CARD === */}
          <View className='bg-white rounded-3xl shadow-sm p-6 mb-6 items-center border border-gray-100'>
            
            {/* Image Container with Edit Badge */}
            <View className='relative mb-4'>
              <Image 
                source={user.image} 
                className='rounded-full border-4 border-teal-50'
                style={{width:200, height:200}}
              />
              <TouchableOpacity className='absolute bottom-0 right-0 bg-teal-500 p-2 rounded-full border-2 border-white'>
                <Edit2 size={14} color="white" />
              </TouchableOpacity>
            </View>

            <Text className='text-2xl font-bold text-gray-900 mb-1'>{user.name}</Text>
            
            <View className='flex-row items-center gap-1 mb-4'>
              <Award size={16} color="#0d9488" />
              <Text className='text-teal-600 font-semibold'>{user.level}</Text>
            </View>

            <View className='flex-row items-center gap-1 mb-6'>
              <MapPin size={14} color="#64748b" />
              <Text className='text-gray-500 text-sm'>{user.location}</Text>
            </View>

            {/* Stats Row */}
            <View className='flex-row w-full justify-between border-t border-gray-100 pt-6 px-4'>
              <View className='items-center flex-1 border-r border-gray-100'>
                <Text className='text-xl font-bold text-gray-900'>{user.completedRecipes}</Text>
                <Text className='text-xs text-gray-500 uppercase tracking-wide mt-1'>Recipes</Text>
              </View>
              <View className='items-center flex-1'>
                <Text className='text-xl font-bold text-gray-900'>{user.friends.length}</Text>
                <Text className='text-xs text-gray-500 uppercase tracking-wide mt-1'>Friends</Text>
              </View>
            </View>
          </View>

          {/* === BIO & TAGS === */}
          <View className='bg-white rounded-3xl shadow-sm p-6 mb-6 border border-gray-100'>
            <Text className='text-lg font-bold text-gray-900 mb-3'>About Me</Text>
            <Text className='text-gray-600 leading-relaxed mb-6'>
              {user.description}
            </Text>

            <Text className='text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide'>Food Preferences</Text>
            <View className='flex-row flex-wrap gap-2'>
              {user.tags.map((tag, index) => (
                <View key={index} className='bg-slate-100 px-3 py-1.5 rounded-lg'>
                  <Text className='text-slate-600 text-sm font-medium'>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* === MENU ACTIONS === */}
          <View className='gap-3'>
            <View className="flex-col md:flex-row gap-3">
            <TouchableOpacity className='flex-1 flex-row items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm'>
              <View className='w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4'>
                <BookOpen size={20} color="#2563eb" />
              </View>
              <View className='flex-1'>
                <Text className='text-base font-semibold text-gray-900'>Cookbook</Text>
                <Text className='text-xs text-gray-500'>View your saved recipes</Text>
              </View>
              <ArrowLeft size={20} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity className='flex-1 flex-row items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm'>
              <View className='w-10 h-10 bg-purple-50 rounded-full items-center justify-center mr-4'>
                <Users size={20} color="#9333ea" />
              </View>
              <View className='flex-1'>
                <Text className='text-base font-semibold text-gray-900'>Friends</Text>
                <Text className='text-xs text-gray-500'>Manage your connections</Text>
              </View>
              <ArrowLeft size={20} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            </View>

            <TouchableOpacity 
              // onPress={() => router.push('/history')} // Uncomment when you create the page
              className='flex-row items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-1'
            >
              <View className='w-10 h-10 bg-orange-50 rounded-full items-center justify-center mr-4'>
                <UtensilsCrossed size={20} color="#ea580c" />
              </View>
              <View className='flex-1'>
                <Text className='text-base font-semibold text-gray-900'>Meal History</Text>
                <Text className='text-xs text-gray-500'>Previous shopping list items</Text>
              </View>
              <ArrowLeft size={20} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}