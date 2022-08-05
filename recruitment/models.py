from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model
from django.db import models

TYPES = (
    ("tech", "tech"),
    ("business", "business"),
    ("engineering", "engineering"),
    ("marketing", "marketing"),
    ("software development", "software development")
)

# Create your models here.
class User(AbstractUser):
    isRecruiter = models.BooleanField(default=False)

    def serialize(self):
        return {
            "id": self.id,
            "isRecruiter": self.isRecruiter,
            "username": self.username, # username would be the company name for a job poster
            "timestamp": self.date_joined.strftime("%b %d %Y, %I:%M %p")
        }

class Application(models.Model):
    creator = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="recruiter")
    title = models.CharField(max_length = 200)#, choices=CATEGORIES, default="uncategorized")
    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length = 1500)
    category = models.CharField(max_length = 64)
    startingpay = models.FloatField(max_length = 64)
    isclosed = models.BooleanField(default=False)

    def serialize(self):
        return {
            "id": self.id,
            "creator": self.creator.username,
            "title": self.title,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
            "description": self.description,
            "category": self.category,
            "startingpay": self.startingpay,
            "isclosed": self.isclosed
        }

class Apply(models.Model):
    applicant = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="applicant")
    form = models.ForeignKey(Application, on_delete = models.CASCADE)
    accepted = models.BooleanField(default=False)

class Comment(models.Model):
    commenter = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="commenter")
    commentee = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="commentee")
    content = models.CharField(max_length = 500)
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self):
        return {
            "id": self.id,
            "commenter_id": self.commenter.id,
            "commenter": self.commenter.username,
            "content": self.content,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
        }

class Resume(models.Model):
    owner = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    content = models.CharField(max_length = 1500)

class Interest(models.Model):
    owner = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    category = models.CharField(max_length = 64)

class Rating(models.Model):
    rater = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="rater")
    ratee = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="ratee")
    score = models.IntegerField()