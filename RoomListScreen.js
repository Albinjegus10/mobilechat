import React, { useState, useEffect ,useContext} from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet,Button } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../App';

export default function RoomListScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log("kkkk",token)
      const response = await axios.get('http://192.168.1.122:8000/api/rooms/', {
        headers: { Authorization: `Token ${token}` }
      });
      setRooms(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomItem}
            onPress={() => navigation.navigate('Chat', { roomId: item.id })}
          >
            <Text style={styles.roomName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Logout" onPress={() => logout()} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  roomItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  roomName: {
    fontSize: 16,
    color: '#333',
  }
});