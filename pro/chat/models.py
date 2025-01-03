from django.db import models

from django.db import models
from django.contrib.auth.models import User

class Room(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Message(models.Model):
    room_id = models.CharField(max_length=100)
    content = models.TextField()
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='chat_images/', null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def to_json(self):
        return {
            'id': self.id,
            'message': self.content,
            'sender': self.sender.username,
            'timestamp': self.timestamp.isoformat(),
            'room_id': self.room_id,
            'image': self.image.url if self.image else None
        }
