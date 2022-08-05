from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API routes
    path("listing/<str:filter>", views.get_listings, name="listings"),
    path("listing", views.create_job, name="newjob"),
    path("update", views.mark_listing, name="markdonelisting"),
    path("delete", views.delete_listing),
    path("apply", views.create_application, name="apply"),
    path("profile", views.get_profile, name="profile"),
    path("profile/update", views.update_profile, name="update"),
    path("profile/comment", views.add_comment, name="comment"),
    path("comment/update", views.update_comment, name="updatecomment"),
    path("rating/update", views.add_update_rating, name="updaterating"),
    path("accept", views.toggle_acceptance, name="accept"),
    path("accepted", views.get_accepted, name="accepted"),
    path("main", views.get_main, name="main")
]
