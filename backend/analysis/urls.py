from django.urls import path
from . import views

urlpatterns = [
    path("ping/", views.ping, name="ping"),
    path("query/", views.handle_query, name="handle_query"),
]
