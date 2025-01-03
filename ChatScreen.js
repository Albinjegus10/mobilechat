import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Feather } from '@expo/vector-icons';

const ENDPOINT = 'http://192.168.1.122:8000';

export default function ChatScreen({ route, navigation }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const ws = useRef(null);
  const { roomId } = route.params;
  const flatListRef = useRef();
  const MAX_RETRIES = 5;

  useEffect(() => {
    const setup = async () => {
      try {
        const storedUsername = await AsyncStorage.getItem('username');
        setUsername(storedUsername || '');
        await connectWebSocket();
        await fetchMessages();
        await requestMediaPermissions();
      } catch (error) {
        console.error('Setup error:', error);
        Alert.alert('Error', 'Failed to initialize chat. Please try again.');
      }
    };
    setup();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const requestMediaPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your media library to send images.');
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const connectWebSocket = async () => {
    try {
      if (retryCount >= MAX_RETRIES) {
        Alert.alert('Connection Error', 'Unable to establish connection. Please check your internet connection.');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      const wsUrl = `ws://192.168.1.122:8000/ws/api/${roomId}/?token=${token}`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setWsConnected(true);
        setRetryCount(0);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const messageWithId = {
            id: data.id || `temp-${Date.now()}`,
            message: data.message,
            sender: data.sender || 'Anonymous',
            timestamp: data.timestamp || new Date().toISOString(),
            image: data.image,
            ...data
          };
          setMessages(prev => [messageWithId, ...prev]);
        } catch (error) {
          console.error('Message processing error:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.current.onclose = () => {
        console.log('WebSocket closed');
        setWsConnected(false);
        setRetryCount(prev => prev + 1);
        setTimeout(connectWebSocket, 3000);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setWsConnected(false);
      setRetryCount(prev => prev + 1);
      setTimeout(connectWebSocket, 3000);
    }
  };

  const fetchMessages = async (loadMore = false) => {
    try {
      if (loading) return;
      
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(
        `${ENDPOINT}/api/messages/?room=${roomId}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      const messagesWithIds = response.data.map(msg => ({
        ...msg,
        id: msg.id || `msg-${Date.now()}-${Math.random()}`
      }));

      if (loadMore) {
        setMessages(prev => [...prev, ...messagesWithIds]);
      } else {
        setMessages(messagesWithIds);
      }
    } catch (error) {
      console.error('Message fetch error:', error);
      Alert.alert('Error', 'Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !wsConnected) return;

    try {
      const messageData = {
        message: newMessage.trim(),
        room_id: roomId,
        timestamp: new Date().toISOString(),
        sender: username
      };
      
      ws.current.send(JSON.stringify(messageData));
      setNewMessage('');
    } catch (error) {
      console.error('Message send error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        formData.append('image', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        });
        formData.append('room', roomId);

        const response = await axios.post(`${ENDPOINT}/api/messages/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Token ${token}`,
          },
        });

        if (response.data) {
          fetchMessages();
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === username ? styles.sentMessage : styles.receivedMessage
    ]}>
      <Text style={styles.senderName}>{item.sender}</Text>
      {item.message && (
        <Text style={styles.messageText}>{item.message}</Text>
      )}
      {item.image && (
        <TouchableOpacity 
          onPress={() => navigation.navigate('ImageView', { uri: item.image })}
        >
          <Image 
            source={{ uri: item.image }} 
            style={styles.messageImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {!wsConnected && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionText}>Reconnecting...</Text>
        </View>
      )}
      
      {loading && messages.length === 0 ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderMessage}
          onEndReached={() => fetchMessages(true)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={pickImage}
          disabled={!wsConnected}
        >
          <Feather 
            name="image" 
            size={24} 
            color={wsConnected ? "#007AFF" : "#ccc"} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sendButton, !wsConnected && styles.buttonDisabled]} 
          onPress={sendMessage}
          disabled={!wsConnected || !newMessage.trim()}
        >
          <Feather 
            name="send" 
            size={24} 
            color={wsConnected && newMessage.trim() ? "#fff" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  connectionStatus: {
    backgroundColor: '#ffeb3b',
    padding: 10,
    alignItems: 'center',
  },
  connectionText: {
    color: '#333',
    fontSize: 14,
  },
  loader: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 12,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageImage: {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').width * 0.6,
    borderRadius: 10,
    marginTop: 5,
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  iconButton: {
    padding: 10,
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
    marginLeft: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});