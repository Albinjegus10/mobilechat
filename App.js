import React, { createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import RoomListScreen from './screens/RoomListScreen';
import ChatScreen from './screens/ChatScreen';

export const AuthContext = createContext();
const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setIsLoggedIn(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ setIsLoggedIn, logout }}>
      <NavigationContainer>
        <Stack.Navigator>
          {!isLoggedIn ? (
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
            />
          ) : (
            <>
              <Stack.Screen name="Rooms" component={RoomListScreen} />
              <Stack.Screen name="Chat" component={ChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
