from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.core.paginator import Paginator
from django.db.models import Count, Avg

from .models import *

import json

CATEGORIES = ["tech", "business", "engineering", "marketing", "software development"]

# Create your views here.
def index(request):
    return render(request, "recruitment/index.html")

# registration, login and logout functions are reused from previous projects
def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "recruitment/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "recruitment/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]

        try:
            request.POST["isRecruiter"]
            isRecruiter = True
        except:
            isRecruiter = False

        if password != confirmation:
            return render(request, "recruitment/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username=username, email=email, password=password, isRecruiter=isRecruiter)
            user.save()
        except IntegrityError:
            return render(request, "recruitment/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "recruitment/register.html")
# registration, login and logout functions are reused from previous projects

# 4 routes: all, category filter, company filter, applied-to filter
def get_listings(request, filter):
    # initialize page as dictionary
    page = {"q", 1}

    if request.GET.get('q', '') != '':
        page = json.loads(request.GET.get('q', ''))

    if filter == "all":
        query = Application.objects.all().filter(isclosed = False)
    elif filter == "category":
        categoryData = request.GET.get('category', '')
        query = Application.objects.filter(category=categoryData).filter(isclosed = False)
    elif filter == "company":
        company = request.GET.get('category', '')
        try:
            user = User.objects.get(username = company)
        except:
            return JsonResponse({"error": "Company not found."}, status=404)
        query = Application.objects.filter(creator=user).filter(isclosed = False)
    else:
        return JsonResponse({"error": "Invalid filter."}, status=400)

    # sort in reverse chronological order (latest first)
    query = query.order_by("-timestamp").all()

    # paginate the query
    p = Paginator(query, 5)
    if page > p.num_pages:
        entries = p.page(p.num_pages)
    else:
        entries = p.page(page)
    
    # listings should contain all info of a listing, number of applicants, whether user has applied
    serializedEntries = [entry.serialize() for entry in entries]

    for i in range(0,len(serializedEntries)):        
        #query number of applicants and add it in as an attribute
        applicants_count = Apply.objects.filter(form = entries.object_list[i]).aggregate(Count('applicant'))
        serializedEntries[i]["applicant"] = applicants_count['applicant__count']
        #query if user has also applied to it

        # user has applied
        if request.user.is_authenticated:
            has_applied = list(Apply.objects.filter(form = entries.object_list[i], applicant=request.user))
            if len(has_applied) > 0:
                serializedEntries[i]["has_applied"] = True
            else:
                serializedEntries[i]["has_applied"] = False

            serializedEntries[i]["isrecruiter"] = request.user.isRecruiter

    return JsonResponse(serializedEntries, safe=False)

@login_required
def create_job(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    currentUser = request.user
    # check if user is recruiter or not
    if currentUser.isRecruiter:
        # process the form here
        data = json.loads(request.body)
        creator = currentUser
        title = data["title"]
        description = data["description"]
        category = data["category"]
        startingpay = data["startingpay"]
        entry = Application(creator=creator, title=title, description=description, category=category, startingpay=startingpay)
        entry.save()
        
        # immediately send json back to user if successful to update job listings page
        return JsonResponse(data={"message": "Job created successfully."}, safe=False, status=201)
    
    return JsonResponse({"error": "Account must be recruiter type."}, safe=False, status=400)


# create an application to a job
@login_required
def create_application(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    # get user entry from db
    try:
        # put job id in json
        data = json.loads(request.body)
        jobentry = Application.objects.get(id=data["id"])
        # only allow current user to apply
        query = Apply.objects.filter(applicant=request.user, form=jobentry)
        if len(list(query)) > 0:
            # delete entry
            query[0].delete()
            appstatus = False
        else:
            # create new entry
            newapply = Apply(applicant=request.user, form=jobentry)
            newapply.save()
            appstatus = True
        
        # query new number of applicants
        applicants_count = Apply.objects.filter(form = jobentry).aggregate(Count('applicant'))['applicant__count']
    except:
        return JsonResponse({"error": "Invalid job."}, status=400)
    finally:
        # change to successful job application
        return JsonResponse({"message": "Application updated successfully.", "appstatus": appstatus, "appcount": applicants_count}, status=201)

@login_required
def get_profile(request):
    # if no GET param then load self profile
    if request.GET.get('q', '') == '':
        searched = request.user
    else:
        try:
            searched = User.objects.get(username=request.GET.get('q', ''))
        except:
            return JsonResponse({"error": "Company or User not found."}, status=404)
    # get profile object in json
    profile = {"user": searched.serialize()}

    # company should return username, timestamp, listings
    if not searched.isRecruiter:
        # get resume
        try:
            resume = Resume.objects.get(owner=searched)
            profile["resume"] = resume.content
        except:
            profile["resume"] = ""

        # get interested categories
        interest = Interest.objects.filter(owner=searched)
        # convert to list 
        profile["interest"] = [intcat.category for intcat in list(interest)]
    
    # else get comments for company
    else:
        comment = Comment.objects.filter(commentee=searched)
        # order it by reverse chronological order
        comment = comment.order_by("-timestamp").all()
        profile["comment"] = [comm.serialize() for comm in list(comment)]
        # get rating score too
        scoreQuery = Rating.objects.filter(ratee=searched).aggregate(Avg('score'))
        if scoreQuery['score__avg'] is None:
            profile["rating"] = -1
        else:
            profile["rating"] = scoreQuery['score__avg']

    return JsonResponse(profile, safe=False)

@login_required
def update_profile(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)

    data = json.loads(request.body)

    # for each entry, check if exist, then create / delete entry                
    for category in CATEGORIES:
        checkCategory(request, category, data)

    # for resume, check if exist, if it doesn't then make new and save
    resume = list(Resume.objects.filter(owner=request.user))
    if len(resume) == 0:
        newResume = Resume(owner=request.user, content=data["resume"])
        newResume.save()
    else:
        resume[0].content = data["resume"]
        resume[0].save()
    # else update it
    return JsonResponse({"message": "Profile updated successfully."}, status=201)

def checkCategory(request, category, data):
    # check if it exists first
    query = Interest.objects.filter(owner = request.user, category=category)
    listlen = len(list(query))
    # force query to evaluate and check for existence
    if listlen == 0 and data[category]:
        # create entry
        newInterest = Interest(owner=request.user, category = category)
        newInterest.save()
    elif listlen == 1 and not data[category]:
        #remove entry
        query[0].delete()

@login_required 
def add_comment(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    data = json.loads(request.body)

    try:
        company = User.objects.get(id = data["id"])
    except:
        return JsonResponse({"error": "Company not found."}, status=404)
    
    if data["id"] == request.user.id or not company.isRecruiter:
        return JsonResponse({"error": "Comment can only be on company."}, status=400)

    newcomment = Comment(commenter=request.user, commentee=company, content=data["content"])
    newcomment.save()
    return JsonResponse({"message": "Comment added successfully.", "comment": newcomment.serialize()}, safe=False)

@login_required
def update_comment(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)
    data = json.loads(request.body)

    try:
        editcomment = Comment.objects.get(id = data["id"])
    except:
        return JsonResponse({"error": "Comment not found."}, status=404)

    # check if user is the one who made the comment
    if editcomment.commenter.id != request.user.id:
        return JsonResponse({"error": "User is not commenter."}, status=400)

    editcomment.content = data["content"]
    editcomment.save()
    return JsonResponse({"message": "Comment updated successfully."}, status=200)

def get_main(request):
    if not request.user.is_authenticated:
        return JsonResponse({"message": "Log in to view customized homepage"})
    if request.user.isRecruiter:
        query = Application.objects.filter(creator=request.user)
        # allow recruiter to "access" listings that were made and give option to edit/close/remove
        queryList = list(query)
        returnData = [listing.serialize() for listing in queryList]
        for i in range(0,len(returnData)):        
            #query number of applicants and add it in as an attribute
            applicants = Apply.objects.filter(form = queryList[i])
            applist = list(applicants)
            applicantsList = [app.applicant.serialize() for app in applist]
            for j in range(0, len(applist)):
                applicantsList[j]["accepted"] = applist[j].accepted

            returnData[i]["applicant"] = applicantsList
            returnData[i]["applicantcount"] = len(applicantsList)
        return JsonResponse({"message":returnData, "user": request.user.isRecruiter},safe=False)

    else:
        # get new listings from categories user has subscribed to
        subscribed = [cat.category for cat in list(Interest.objects.filter(owner = request.user))]
        catlisting = Application.objects.filter(category__in=subscribed)
        # arrange in newest first
        catlisting = catlisting.order_by("-timestamp").all()
        catlistinglist = list(catlisting)
        returnData = [cat.serialize() for cat in catlistinglist]

        # get only the first 5 entries
        # get listings that user has applied to 
        applied = Apply.objects.filter(applicant=request.user)
        appliedlist = [app.form for app in list(applied)]
        applisting = [app.serialize() for app in appliedlist]

        for i in range(0,len(appliedlist)):       
            applicants_count = Apply.objects.filter(form = appliedlist[i]).aggregate(Count('applicant'))
            applisting[i]["applicant"] = applicants_count['applicant__count'] 
            applisting[i]["has_applied"] = True
        
        for i in range(0,len(returnData)):        
            applicants_count = Apply.objects.filter(form = catlistinglist[i]).aggregate(Count('applicant'))
            returnData[i]["applicant"] = applicants_count['applicant__count']

            for j in range(0,len(appliedlist)):
                if returnData[i]["id"] == applisting[j]["id"]:
                    returnData[i]["has_applied"] = applisting[j]["id"]
                else:
                    returnData[i]["has_applied"] = False
        
        return JsonResponse({"message":returnData,"app":applisting,"user":request.user.isRecruiter}, safe=False)

def delete_listing(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)

    # get id of listing from json
    data = json.loads(request.body)
    query = Application.objects.get(id = data["q"])
    if query.creator == request.user:
        query.delete()
        return JsonResponse({"message":"Listing deleted successfully"}, safe=False)
    else:
        return JsonResponse({"message":"You are not authorized to delete this listing."}, safe=False)

#get the details of the listing for the recruiter to inspect the applicants
def get_listing(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)
    data = json.loads(request.body)["q"]
    query = Application.objects.get(id = data)
    if query.creator != request.user:
        return JsonResponse({"message":"You are not authorized to view this listing."}, safe=False)
    applicant = Apply.objects.get(form=query)
    return JsonResponse(list(applicant), safe=False)

# mark listing as done
def mark_listing(request):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)

    data = json.loads(request.body)["q"]
    query = Application.objects.get(id = data)
    if query.creator != request.user:
        return JsonResponse({"message":"You are not authorized to view this listing."}, safe=False)
    query.isclosed = True
    query.save()
    return JsonResponse({"message":"Listing closed successfully."}, safe=False)

#take company user and int from JSON
def add_update_rating(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    # check if user is not recruiter
    if request.user.isRecruiter:
        return JsonResponse({"message": "Only non-recruiters users are allowed to rate."})
    data = json.loads(request.body)
    # get company in question
    company = User.objects.filter(id = data["id"])
    if len(list(company)) == 0:
        return JsonResponse({"error": "Company not found."})
    try:
        query = Rating.objects.get(rater=request.user,ratee=company[0])
        query.score = data["rating"]
        query.save()
    except:
        newEntry = Rating(rater=request.user, ratee=company[0], score=data["rating"])
        newEntry.save()
    
    # calculate the new average        
    scoreQuery = Rating.objects.filter(ratee=company[0]).aggregate(Avg('score'))
    if scoreQuery['score__avg'] is None:
        newAvg = -1
    else:
        newAvg = scoreQuery['score__avg']
    return JsonResponse({"message": "Rating successfully updated.", "score": newAvg}, status=200)

# accept and unaccept user in listing (api call is a toggle)
def toggle_acceptance(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    data = json.loads(request.body)
    # applicant user id and listing id
    # get listing
    try:
        listing = Application.objects.get(id = data["listingid"])
    except:
        return JsonResponse({"error": "Listing not found."}, status=404)
    if listing.creator != request.user:
        return JsonResponse({"error": "Current user is not creator of listing."})
    
    # get user id
    try:
        applicant = User.objects.get(id = data["applicantid"])
    except:
        return JsonResponse({"error": "Applicant not found."}, status=404)

    # try to get the entry itself
    try: 
        entry = Apply.objects.get(form=listing,applicant=applicant)
        # entry exists, toggle it 
        entry.accepted = not entry.accepted
        entry.save()
    except:
        return JsonResponse({"error": "Entry not found."}, status=404)
    return JsonResponse({"message": "Entry successfully updated.", "accepted":entry.accepted}, status=200)

@login_required
def get_accepted(request):
    if request.user.isRecruiter:
        return JsonResponse({"error": "User must not be recruiter."})
    
    query = Apply.objects.filter(applicant=request.user, accepted = True)
    queryList = list(query)
    acceptedListings = [accept.form.serialize() for accept in queryList]
    return JsonResponse({"message": acceptedListings})
