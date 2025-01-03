from django.urls import path
from . import views

urlpatterns = [
    path('api/rooms/', views.RoomListCreateAPIView.as_view(), name='room-list-create'),
    path('api/rooms/<int:pk>/', views.RoomRetrieveUpdateDestroyAPIView.as_view(), name='room-retrieve-update-destroy'),
    path('api/messages/', views.MessageListCreateAPIView.as_view(), name='message-list-create'),
    path('login/', views.login_view, name='login'),
]